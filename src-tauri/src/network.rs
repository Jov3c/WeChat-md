use futures_util::StreamExt;
use reqwest::{header, Client, Response, StatusCode};
use serde::Serialize;
use std::net::{IpAddr, Ipv4Addr};
use std::time::Duration;
use tokio::net::lookup_host;
use url::Url;

const MAX_ARTICLE_BYTES: usize = 5 * 1024 * 1024;
const MAX_IMAGE_BYTES: usize = 20 * 1024 * 1024;
const MAX_REDIRECTS: usize = 3;

fn parse_http_url(input: &str) -> Result<Url, String> {
    let url = Url::parse(input).map_err(|_| "地址无效".to_string())?;
    if !matches!(url.scheme(), "http" | "https")
        || !url.username().is_empty()
        || url.password().is_some()
        || url.host_str().is_none()
    {
        return Err("地址不安全或无效".into());
    }
    Ok(url)
}

fn validate_wechat_url(input: &str) -> Result<Url, String> {
    let url = parse_http_url(input)?;
    if url.scheme() != "https" || url.host_str() != Some("mp.weixin.qq.com") {
        return Err("目前仅支持微信公众号文章链接".into());
    }
    Ok(url)
}

fn is_public_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ip) => {
            let octets = ip.octets();
            !ip.is_private()
                && !ip.is_loopback()
                && !ip.is_link_local()
                && !ip.is_unspecified()
                && !ip.is_broadcast()
                && !ip.is_multicast()
                && !(octets[0] == 100 && (64..=127).contains(&octets[1]))
                && ip != Ipv4Addr::new(255, 255, 255, 255)
        }
        IpAddr::V6(ip) => {
            !ip.is_loopback()
                && !ip.is_unspecified()
                && !ip.is_unique_local()
                && !ip.is_unicast_link_local()
                && !ip.is_multicast()
        }
    }
}

fn validate_remote_url(input: &str) -> Result<Url, String> {
    let url = parse_http_url(input)?;
    let host = url.host_str().ok_or_else(|| "图片地址无效".to_string())?;
    let normalized = host.trim_matches(['[', ']']).to_ascii_lowercase();
    if normalized == "localhost" || normalized.ends_with(".localhost") {
        return Err("图片地址不安全或无效".into());
    }
    if let Ok(ip) = normalized.parse::<IpAddr>() {
        if !is_public_ip(ip) {
            return Err("图片地址不安全或无效".into());
        }
    }
    Ok(url)
}

fn extend_limited(body: &mut Vec<u8>, chunk: &[u8], limit: usize) -> Result<(), String> {
    if body.len().saturating_add(chunk.len()) > limit {
        return Err("响应内容过大".into());
    }
    body.extend_from_slice(chunk);
    Ok(())
}

async fn validate_resolved_target(url: &Url) -> Result<(), String> {
    let host = url.host_str().ok_or_else(|| "地址无效".to_string())?;
    if let Ok(ip) = host.trim_matches(['[', ']']).parse::<IpAddr>() {
        return is_public_ip(ip).then_some(()).ok_or_else(|| "地址指向了不安全的网络".into());
    }
    let port = url.port_or_known_default().ok_or_else(|| "地址端口无效".to_string())?;
    let addresses: Vec<_> = lookup_host((host, port))
        .await
        .map_err(|_| "无法解析目标地址".to_string())?
        .collect();
    if addresses.is_empty() || addresses.iter().any(|address| !is_public_ip(address.ip())) {
        return Err("地址指向了不安全的网络".into());
    }
    Ok(())
}

fn client() -> Result<Client, String> {
    Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|_| "无法初始化网络请求".into())
}

fn redirect_target(response: &Response, current: &Url) -> Result<Option<Url>, String> {
    if !response.status().is_redirection() {
        return Ok(None);
    }
    let location = response
        .headers()
        .get(header::LOCATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| "跳转地址无效".to_string())?;
    current.join(location).map(Some).map_err(|_| "跳转地址无效".into())
}

async fn read_limited(response: Response, limit: usize) -> Result<Vec<u8>, String> {
    if response.content_length().is_some_and(|size| size > limit as u64) {
        return Err("响应内容过大".into());
    }
    let mut body = Vec::new();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|_| "下载内容失败".to_string())?;
        extend_limited(&mut body, &chunk, limit)?;
    }
    Ok(body)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HtmlResponse {
    html: String,
    final_url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageResponse {
    bytes: Vec<u8>,
    mime_type: String,
}

#[tauri::command]
pub async fn fetch_wechat_html(input: String) -> Result<HtmlResponse, String> {
    let client = client()?;
    let mut url = validate_wechat_url(&input)?;
    for redirect in 0..=MAX_REDIRECTS {
        validate_resolved_target(&url).await?;
        let response = client
            .get(url.clone())
            .header(header::ACCEPT, "text/html,application/xhtml+xml")
            .header(header::ACCEPT_LANGUAGE, "zh-CN,zh;q=0.9")
            .header(header::USER_AGENT, "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.50")
            .send()
            .await
            .map_err(|_| "暂时无法读取这篇文章".to_string())?;
        if let Some(next) = redirect_target(&response, &url)? {
            if redirect == MAX_REDIRECTS {
                return Err("文章跳转次数过多".into());
            }
            url = validate_wechat_url(next.as_str())?;
            continue;
        }
        if !response.status().is_success() {
            return Err(format!("微信返回了 {}", response.status()));
        }
        let bytes = read_limited(response, MAX_ARTICLE_BYTES).await?;
        let html = String::from_utf8(bytes).map_err(|_| "文章编码无法识别".to_string())?;
        return Ok(HtmlResponse { html, final_url: url.to_string() });
    }
    Err("暂时无法读取这篇文章".into())
}

#[tauri::command]
pub async fn fetch_remote_image(input: String) -> Result<ImageResponse, String> {
    let client = client()?;
    let mut url = validate_remote_url(&input)?;
    for redirect in 0..=MAX_REDIRECTS {
        validate_resolved_target(&url).await?;
        let response = client
            .get(url.clone())
            .header(header::ACCEPT, "image/*")
            .send()
            .await
            .map_err(|_| "图片下载失败".to_string())?;
        if let Some(next) = redirect_target(&response, &url)? {
            if redirect == MAX_REDIRECTS {
                return Err("图片跳转次数过多".into());
            }
            url = validate_remote_url(next.as_str())?;
            continue;
        }
        if response.status() != StatusCode::OK {
            return Err("图片下载失败".into());
        }
        let mime_type = response
            .headers()
            .get(header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.split(';').next())
            .map(str::trim)
            .filter(|value| value.starts_with("image/"))
            .ok_or_else(|| "链接内容不是图片".to_string())?
            .to_string();
        let bytes = read_limited(response, MAX_IMAGE_BYTES).await?;
        return Ok(ImageResponse { bytes, mime_type });
    }
    Err("图片下载失败".into())
}

#[cfg(test)]
mod tests {
    use super::{extend_limited, fetch_wechat_html, validate_remote_url, validate_wechat_url};

    #[test]
    fn accepts_only_the_real_wechat_https_origin() {
        assert!(validate_wechat_url("https://mp.weixin.qq.com/s/example").is_ok());
        for input in [
            "http://mp.weixin.qq.com/s/example",
            "https://mp.weixin.qq.com.evil.test/s/example",
            "https://user@mp.weixin.qq.com/s/example",
            "file:///C:/Windows/System32/config",
        ] {
            assert!(validate_wechat_url(input).is_err(), "accepted {input}");
        }
    }

    #[test]
    fn rejects_local_and_private_image_targets() {
        assert!(validate_remote_url("https://mmbiz.qpic.cn/example.jpg").is_ok());
        for input in [
            "http://localhost/image.png",
            "http://127.0.0.1/image.png",
            "http://10.0.0.1/image.png",
            "http://172.16.0.1/image.png",
            "http://192.168.1.1/image.png",
            "http://169.254.1.1/image.png",
            "http://[::1]/image.png",
            "http://[fc00::1]/image.png",
            "ftp://example.com/image.png",
        ] {
            assert!(validate_remote_url(input).is_err(), "accepted {input}");
        }
    }

    #[test]
    fn stops_before_a_response_grows_past_its_limit() {
        let mut body = vec![1, 2];
        assert!(extend_limited(&mut body, &[3], 3).is_ok());
        assert_eq!(body, vec![1, 2, 3]);
        assert!(extend_limited(&mut body, &[4], 3).is_err());
        assert_eq!(body, vec![1, 2, 3]);
    }

    #[tokio::test]
    #[ignore = "requires a public WeChat article and network access"]
    async fn fetches_a_real_public_wechat_article() {
        let result = fetch_wechat_html(
            "https://mp.weixin.qq.com/s/BP-hmJmGUIHKY-epBk1okA".to_string(),
        )
        .await
        .expect("public article should be fetchable");
        assert!(result.html.contains("js_content"));
        assert!(result.final_url.starts_with("https://mp.weixin.qq.com/"));
    }
}
