import { describe, expect, it } from 'vitest'
import { createDesktopImageFetcher, createDesktopWechatExtractor, type InvokeCommand } from './desktopNetwork'

describe('desktop network bridge', () => {
  it('parses HTML returned by the native WeChat command', async () => {
    const invoke: InvokeCommand = async (command) => {
      expect(command).toBe('fetch_wechat_html')
      return {
        finalUrl: 'https://mp.weixin.qq.com/s/example',
        html: '<h1 id="activity-name">桌面文章</h1><span id="js_name">作者</span><section id="js_content"><p>这是一段长度足够的公众号正文内容。</p></section>',
      }
    }

    const result = await createDesktopWechatExtractor(invoke)('https://mp.weixin.qq.com/s/example')

    expect(result.title).toBe('桌面文章')
    expect(result.markdown).toContain('这是一段长度足够的公众号正文内容。')
  })

  it('adapts native image bytes to the existing fetch response contract', async () => {
    const invoke: InvokeCommand = async () => ({ bytes: [1, 2, 3], mimeType: 'image/png' })
    const response = await createDesktopImageFetcher(invoke)('https://img.example.com/a.png')

    expect(response.ok).toBe(true)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([1, 2, 3])
  })
})
