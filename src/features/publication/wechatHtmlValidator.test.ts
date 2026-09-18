import { describe, expect, it } from 'vitest'
import { validateWechatHtml } from './wechatHtmlValidator'
import absolutePositionFixture from './fixtures/absolute-position.html?raw'
import cssVariableFixture from './fixtures/css-variable.html?raw'
import externalFontFixture from './fixtures/external-font.html?raw'
import unsafeTagFixture from './fixtures/unsafe-tag.html?raw'
import unresolvedAssetFixture from './fixtures/unresolved-asset.html?raw'

function issueCodes(html: string) {
  return validateWechatHtml(html).map((issue) => issue.code)
}

describe('WeChat HTML validator', () => {
  it('reports unsafe and interactive elements as errors', () => {
    const issues = validateWechatHtml(`
      <article>
        <script>alert(1)</script>
        <style>.card { color: red; }</style>
        <iframe src="https://example.com"></iframe>
        <form><input><textarea></textarea></form>
        <video src="movie.mp4"></video>
      </article>
    `)

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unsafe-tag-script', level: 'error', selector: 'script' }),
      expect.objectContaining({ code: 'unsafe-tag-style', level: 'error', selector: 'style' }),
      expect.objectContaining({ code: 'unsafe-tag-iframe', level: 'error', selector: 'iframe' }),
      expect.objectContaining({ code: 'unsafe-tag-form', level: 'error', selector: 'form' }),
      expect.objectContaining({ code: 'unsafe-tag-input', level: 'error', selector: 'input' }),
      expect.objectContaining({ code: 'unsafe-tag-textarea', level: 'error', selector: 'textarea' }),
      expect.objectContaining({ code: 'unsafe-tag-video', level: 'error', selector: 'video' }),
    ]))
  })

  it('reports unresolved local resources and unsafe URL schemes as errors', () => {
    const issues = validateWechatHtml(`
      <article>
        <img src="asset://cover">
        <img src="blob:http://localhost/image-1">
        <img src="">
        <img src="data:text/html;base64,PGgxPk5vdCBhbiBpbWFnZTwvaDE+">
        <a href="javascript:alert(1)">危险链接</a>
        <p onclick="alert(1)">带事件属性的内容</p>
      </article>
    `)

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unresolved-asset-url', level: 'error' }),
      expect.objectContaining({ code: 'unresolved-blob-url', level: 'error' }),
      expect.objectContaining({ code: 'invalid-image-url', level: 'error' }),
      expect.objectContaining({ code: 'unsafe-image-scheme', level: 'error' }),
      expect.objectContaining({ code: 'unsafe-url-scheme', level: 'error' }),
      expect.objectContaining({ code: 'unsafe-event-handler', level: 'error' }),
    ]))
  })

  it('reports CSS that the WeChat editor may remove or reinterpret', () => {
    const issues = validateWechatHtml(`
      <article>
        <section style="position:absolute;display:grid;transform:translateX(2px);overflow:hidden;color:var(--accent)">卡片</section>
        <div style="display:flex;float:left"><span>左栏</span><span>右栏</span></div>
      </article>
    `)

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'position-layout', level: 'warning' }),
      expect.objectContaining({ code: 'grid-layout', level: 'warning' }),
      expect.objectContaining({ code: 'flex-layout', level: 'warning' }),
      expect.objectContaining({ code: 'float-layout', level: 'warning' }),
      expect.objectContaining({ code: 'transform-style', level: 'warning' }),
      expect.objectContaining({ code: 'clipped-overflow', level: 'warning' }),
      expect.objectContaining({ code: 'css-variable', level: 'warning' }),
    ]))
  })

  it('reports empty content and unusually wide blocks with actionable suggestions', () => {
    const issues = validateWechatHtml(`
      <article>
        <h2></h2>
        <a href="">空链接</a>
        <table style="width:1200px"><tbody><tr><td>内容</td></tr></tbody></table>
        <pre style="width:900px"><code>const value = 1</code></pre>
      </article>
    `)

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'empty-heading', level: 'warning', suggestion: expect.any(String) }),
      expect.objectContaining({ code: 'empty-link', level: 'warning', suggestion: expect.any(String) }),
      expect.objectContaining({ code: 'wide-table', level: 'warning' }),
      expect.objectContaining({ code: 'wide-code-block', level: 'warning' }),
    ]))
  })

  it('adds informational notices for image-heavy and very long articles', () => {
    const images = Array.from({ length: 13 }, (_, index) => `<img src="https://example.com/${index}.png">`).join('')
    const html = `<article>${images}<p>${'长内容'.repeat(7000)}</p></article>`

    expect(issueCodes(html)).toEqual(expect.arrayContaining(['many-images', 'long-article']))
    expect(validateWechatHtml(html).filter((issue) => ['many-images', 'long-article'].includes(issue.code)))
      .toEqual(expect.arrayContaining([expect.objectContaining({ level: 'info' })]))
  })

  it('warns when an embedded image is roughly larger than five megabytes', () => {
    const base64 = 'A'.repeat(7_100_000)
    const issues = validateWechatHtml(`<article><img src="data:image/png;base64,${base64}" alt="大图"></article>`)

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'oversized-image', level: 'warning' }),
    ]))
  })

  it('accepts a portable semantic body fragment', () => {
    expect(validateWechatHtml(`
      <h1 style="font-size:32px;color:#141413">标题</h1>
      <p style="font-size:16px;line-height:1.8">正文 <strong>重点</strong></p>
      <img src="data:image/png;base64,aW1hZ2U=" alt="配图">
      <a href="https://example.com">安全链接</a>
    `)).toEqual([])
  })

  it('reports preview wrappers and nested lists that can break WeChat paste structure', () => {
    const issues = validateWechatHtml(`
      <article>
        <div><table><tbody><tr><td>内容</td></tr></tbody></table></div>
        <ul><li>一级<ul><li>二级</li></ul></li></ul>
      </article>
    `)

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'preview-root-wrapper', level: 'error' }),
      expect.objectContaining({ code: 'preview-table-wrapper', level: 'error' }),
      expect.objectContaining({ code: 'nested-list-structure', level: 'error' }),
    ]))
  })

  it('rejects SVG data URLs because they may contain executable content', () => {
    const issues = validateWechatHtml(`
      <article>
        <img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj48L3N2Zz4=" alt="不安全的矢量图">
      </article>
    `)

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unsafe-image-scheme', level: 'error' }),
    ]))
  })

  it('does not flag inline flex used only to align a small decorative marker', () => {
    expect(issueCodes('<article><h2><span style="display:inline-flex">1</span>标题</h2></article>'))
      .not.toContain('flex-layout')
  })

  it('does not treat CSS syntax shown in a code block as active external CSS', () => {
    const codes = issueCodes(`
      <article><pre><code>@media (max-width: 600px) { .card { animation: demo 1s; } }
@keyframes demo { from { opacity: 0; } }
@font-face { font-family: demo; src: url(https://example.com/demo.woff2); }</code></pre></article>
    `)

    expect(codes).not.toEqual(expect.arrayContaining(['media-query', 'keyframes-animation', 'external-font']))
  })

  it('groups repeated compatibility findings so the review stays readable', () => {
    const issues = validateWechatHtml('<article><p style="color:var(--text)">一</p><span style="color:var(--text)">二</span></article>')

    expect(issues.filter((issue) => issue.code === 'css-variable')).toHaveLength(1)
  })

  it('keeps dedicated regression fixtures for critical compatibility classes', () => {
    expect(issueCodes(unsafeTagFixture)).toContain('unsafe-tag-script')
    expect(issueCodes(absolutePositionFixture)).toContain('position-layout')
    expect(issueCodes(unresolvedAssetFixture)).toContain('unresolved-asset-url')
    expect(issueCodes(cssVariableFixture)).toContain('css-variable')
    expect(issueCodes(externalFontFixture)).toEqual(expect.arrayContaining(['unsafe-tag-style', 'external-font']))
  })
})
