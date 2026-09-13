import { fetchWechatArticle, WechatExtractorError } from './wechatExtractor.ts'
import type { ExtractedWechatArticle } from '../src/features/wechat/wechatExtraction.ts'

type Extractor = (url: string) => Promise<ExtractedWechatArticle>

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'cache-control': 'no-store' } })
}

export async function handleWechatExtractRequest(
  request: Request,
  extractor: Extractor = fetchWechatArticle,
) {
  if (request.method !== 'POST') return json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 POST 请求' } }, 405)
  try {
    const body = await request.json() as { url?: unknown }
    if (typeof body.url !== 'string') throw new WechatExtractorError('INVALID_URL', '请粘贴公众号文章链接')
    const url = new URL(body.url.trim())
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'mp.weixin.qq.com') {
      throw new WechatExtractorError('INVALID_URL', '目前仅支持微信公众号文章链接')
    }
    url.hash = ''
    return json({ ok: true, data: await extractor(url.toString()) })
  } catch (error) {
    if (error instanceof WechatExtractorError) {
      const status = error.code === 'INVALID_URL' ? 400 : error.code === 'ARTICLE_TOO_LARGE' ? 413 : 422
      return json({ ok: false, error: { code: error.code, message: error.message } }, status)
    }
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return json({ ok: false, error: { code: 'INVALID_URL', message: '目前仅支持微信公众号文章链接' } }, 400)
    }
    return json({ ok: false, error: { code: 'UNKNOWN', message: '提取失败，请稍后重试' } }, 500)
  }
}
