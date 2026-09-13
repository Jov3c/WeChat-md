import { describe, expect, it } from 'vitest'
import { handleWechatExtractRequest } from './wechatApi'

describe('handleWechatExtractRequest', () => {
  it('拒绝非微信链接且不执行抓取', async () => {
    const request = new Request('http://localhost/api/wechat/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/article' }),
    })
    const response = await handleWechatExtractRequest(request, async () => {
      throw new Error('不应执行抓取')
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: 'INVALID_URL', message: '目前仅支持微信公众号文章链接' },
    })
  })

  it('返回禁止缓存的提取结果', async () => {
    const request = new Request('http://localhost/api/wechat/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://mp.weixin.qq.com/s/example' }),
    })
    const response = await handleWechatExtractRequest(request, async (url) => ({
      sourceUrl: url,
      title: '文章',
      author: '作者',
      html: '<p>正文内容足够长</p>',
      markdown: '正文内容足够长',
      tokens: [],
      components: [],
    }))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual(expect.objectContaining({ ok: true }))
  })
})
