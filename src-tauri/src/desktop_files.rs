use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageFileInput {
    mime_type: String,
    bytes: Vec<u8>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedImages {
    directory: String,
    saved: usize,
}

fn safe_path_segment(input: &str) -> String {
    let cleaned: String = input
        .trim()
        .chars()
        .map(|character| {
            if matches!(character, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*')
                || character.is_control()
            {
                '_'
            } else {
                character
            }
        })
        .take(80)
        .collect();
    let cleaned = cleaned.trim_matches([' ', '.']);
    if cleaned.is_empty() {
        "未命名文章".into()
    } else {
        cleaned.into()
    }
}

fn image_extension(mime_type: &str) -> &'static str {
    match mime_type.to_ascii_lowercase().as_str() {
        "image/jpeg" | "image/jpg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        "image/svg+xml" => "svg",
        "image/bmp" => "bmp",
        "image/avif" => "avif",
        _ => "bin",
    }
}

fn default_directory() -> Result<PathBuf, String> {
    std::env::current_exe()
        .map_err(|_| "无法读取程序安装目录".to_string())?
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "无法读取程序安装目录".to_string())
}

#[tauri::command]
pub fn default_image_save_directory() -> Result<String, String> {
    default_directory().map(|path| path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn save_article_images(
    base_directory: String,
    article_title: String,
    images: Vec<ImageFileInput>,
) -> Result<SavedImages, String> {
    let directory = PathBuf::from(base_directory)
        .join(safe_path_segment(&article_title))
        .join("images");
    std::fs::create_dir_all(&directory).map_err(|_| "无法创建公众号图片目录".to_string())?;
    for (index, image) in images.iter().enumerate() {
        let filename = format!("image-{:03}.{}", index + 1, image_extension(&image.mime_type));
        std::fs::write(directory.join(filename), &image.bytes)
            .map_err(|_| format!("第 {} 张图片写入失败", index + 1))?;
    }
    Ok(SavedImages {
        directory: directory.to_string_lossy().into_owned(),
        saved: images.len(),
    })
}

#[tauri::command]
pub fn open_image_directory(path: String) -> Result<(), String> {
    let directory = PathBuf::from(path);
    if !directory.is_dir() {
        return Err("图片保存目录不存在".into());
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(directory)
            .spawn()
            .map_err(|_| "无法打开图片保存目录".to_string())?;
        return Ok(());
    }
    #[cfg(not(target_os = "windows"))]
    Err("当前系统暂不支持打开目录".into())
}

#[cfg(test)]
mod tests {
    use super::{image_extension, safe_path_segment};

    #[test]
    fn sanitizes_windows_path_characters_without_losing_the_title() {
        assert_eq!(safe_path_segment(" 标题：A/B*?  "), "标题：A_B__");
        assert_eq!(safe_path_segment("..."), "未命名文章");
    }

    #[test]
    fn uses_the_downloaded_image_mime_type_for_the_file_extension() {
        assert_eq!(image_extension("image/jpeg"), "jpg");
        assert_eq!(image_extension("image/png"), "png");
        assert_eq!(image_extension("image/webp"), "webp");
        assert_eq!(image_extension("image/unknown"), "bin");
    }
}
