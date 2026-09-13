import { describe, expect, it } from 'vitest'
import { parseWechatArticleHtml } from './wechatExtractor'

const articleHtml = `<!doctype html>
<html>
  <head><style>.body-copy { color: #334455; font-size: 17px; line-height: 30.6px; letter-spacing: 1px; }</style></head>
  <body>
    <h1 id="activity-name">测试文章</h1>
    <span id="js_name">测试作者</span>
    <section id="js_content" class="body-copy">
      <script>alert('x')</script>
      <h2 style="color:#C04A36">章节标题</h2>
      <p style="margin-bottom:24px">第一段正文内容足够长，用于识别公众号文章。</p>
      <blockquote style="border-left:3px solid #C04A36;background:#F7F1ED;color:#665544">一段引用</blockquote>
      <img data-src="https://mmbiz.qpic.cn/example.jpg" alt="示例图">
    </section>
  </body>
</html>`

describe('parseWechatArticleHtml', () => {
  it('提取文章信息、正文 Markdown 和可应用样式', () => {
    const result = parseWechatArticleHtml(
      articleHtml,
      'https://mp.weixin.qq.com/s/example',
    )

    expect(result.title).toBe('测试文章')
    expect(result.author).toBe('测试作者')
    expect(result.markdown).toContain('## 章节标题')
    expect(result.markdown).toContain('第一段正文内容足够长')
    expect(result.tokens).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'global.textColor', value: '#334455' }),
      expect.objectContaining({ path: 'global.fontSize', value: 17 }),
      expect.objectContaining({ path: 'global.lineHeight', value: 1.8 }),
      expect.objectContaining({ path: 'global.letterSpacing', value: 1 }),
      expect.objectContaining({ path: 'global.accentColor', value: '#C04A36' }),
      expect.objectContaining({ path: 'headings.h2.color', value: '#C04A36' }),
      expect.objectContaining({ path: 'components.quote.backgroundColor', value: '#F7F1ED' }),
      expect.objectContaining({ path: 'components.quote.borderColor', value: '#C04A36' }),
      expect.objectContaining({ path: 'components.quote.color', value: '#665544' }),
    ]))
    expect(result.components).toEqual(expect.arrayContaining([
      { kind: 'heading', label: '章节标题', count: 1 },
      { kind: 'quote', label: '引用 / 重点提示', count: 1 },
      { kind: 'image', label: '文章图片', count: 1 },
    ]))
  })

  it('移除危险节点并恢复公众号懒加载图片', () => {
    const result = parseWechatArticleHtml(articleHtml, 'https://mp.weixin.qq.com/s/example')

    expect(result.html).not.toContain('<script')
    expect(result.html).not.toContain('alert(')
    expect(result.html).toContain('src="https://mmbiz.qpic.cn/example.jpg"')
    expect(result.html).not.toContain('data-src')
  })

  it('提取列表、表格、图片和分隔线的组件样式', () => {
    const result = parseWechatArticleHtml(`
      <h1 id="activity-name">组件文章</h1><span id="js_name">作者</span>
      <section id="js_content">
        <p>正文内容足够长，用来完成公众号组件样式识别。</p>
        <ul style="color:#456789;padding-left:30px"><li style="margin-bottom:8px">项目</li></ul>
        <table style="border-radius:9px"><thead><tr><th style="background:#EEE8DD;border:1px solid #AA9988">表头</th></tr></thead><tbody><tr><td>内容</td></tr></tbody></table>
        <img src="https://mmbiz.qpic.cn/image.jpg" style="border-radius:10px;box-shadow:0 4px 16px #00000022">
        <hr style="border-top:2px solid #887766;margin:18px 0">
      </section>
    `, 'https://mp.weixin.qq.com/s/components')

    expect(result.tokens).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'components.list.markerColor', value: '#456789' }),
      expect.objectContaining({ path: 'components.list.indent', value: 30 }),
      expect.objectContaining({ path: 'components.list.itemSpacing', value: 8 }),
      expect.objectContaining({ path: 'components.table.headerBackground', value: '#EEE8DD' }),
      expect.objectContaining({ path: 'components.table.borderColor', value: '#AA9988' }),
      expect.objectContaining({ path: 'components.image.borderRadius', value: 10 }),
      expect.objectContaining({ path: 'components.image.shadow', value: true }),
      expect.objectContaining({ path: 'components.divider.color', value: '#887766' }),
      expect.objectContaining({ path: 'components.divider.thickness', value: 2 }),
      expect.objectContaining({ path: 'components.divider.margin', value: 18 }),
    ]))
    expect(result.markdown).toContain('| 表头 |')
    expect(result.markdown).toContain('| 内容 |')
  })

  it('按正文权重识别深层节点中的主样式和强调色', () => {
    const result = parseWechatArticleHtml(`
      <h1 id="activity-name">深层样式文章</h1><span id="js_name">作者</span>
      <section id="js_content">
        <p style="color:rgb(0,122,170);line-height:1.75em;margin-bottom:32px">短强调</p>
        <p style="line-height:1.75em;margin-bottom:32px"><span style="color:rgba(0,0,0,.9);font-size:17px;letter-spacing:.034em">这是一段足够长的正文内容，用来代表文章主要排版样式。</span></p>
        <p style="line-height:1.75em;margin-bottom:32px"><span style="color:rgba(0,0,0,.9);font-size:17px;letter-spacing:.034em">这是另一段正文内容，继续增加主要样式的权重。</span><strong style="color:rgb(0,122,170)">强调内容</strong></p>
      </section>
    `, 'https://mp.weixin.qq.com/s/deep-style')

    expect(result.tokens).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'global.textColor', value: '#000000' }),
      expect.objectContaining({ path: 'global.accentColor', value: '#007AAA' }),
      expect.objectContaining({ path: 'global.fontSize', value: 17 }),
      expect.objectContaining({ path: 'global.lineHeight', value: 1.75 }),
      expect.objectContaining({ path: 'global.letterSpacing', value: 0.58 }),
      expect.objectContaining({ path: 'global.paragraphSpacing', value: 32 }),
    ]))
  })
})
