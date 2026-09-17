import { copyPreparedArticle, makeImageSourcesPortable, preparePreviewArticleForClipboard, serializePreviewArticle } from './richTextClipboard'

describe('rich text clipboard serialization', () => {
  it('omits editor-only dimensions and block metadata from copied HTML', () => {
    const article = document.createElement('article')
    article.className = 'preview-article'
    article.dataset.blockId = 'article-1'
    article.style.width = '720px'
    article.innerHTML = '<h1 data-source-start="1" data-source-end="1">公众号标题</h1>'
    document.body.append(article)

    const html = serializePreviewArticle(article)

    expect(html).not.toContain('width:720px')
    expect(html).not.toContain('data-block-id')
    expect(html).not.toContain('data-source-start')
    expect(html).not.toContain('class="preview-article"')
    article.remove()
  })

  it('keeps hidden style-only markers hidden in copied HTML', () => {
    const article = document.createElement('article')
    article.innerHTML = '<h2><span style="display:none">1</span>标题</h2>'
    document.body.append(article)

    const html = serializePreviewArticle(article)

    expect(html).toContain('display:none')
    article.remove()
  })

  it('keeps article decoration, indentation, and image depth in copied HTML', () => {
    const article = document.createElement('article')
    article.innerHTML = '<h1 style="border-left:3px solid rgb(20, 20, 19)">标题</h1><p style="text-indent:2em">正文</p><img alt="图" style="box-shadow:0 10px 28px rgba(20, 20, 19, 0.14)">'
    document.body.append(article)

    const html = serializePreviewArticle(article)

    expect(html).toContain('border-left:3px solid rgb(20, 20, 19)')
    expect(html).toContain('text-indent:2em')
    expect(html).toContain('box-shadow:0 10px 28px rgba(20, 20, 19, 0.14)')
    article.remove()
  })

  it('adds portable responsive constraints to copied images', () => {
    const article = document.createElement('article')
    article.innerHTML = '<img src="https://example.com/large.png" alt="大图">'
    document.body.append(article)

    const html = serializePreviewArticle(article)

    expect(html).toMatch(/max-width:\s*100%/)
    expect(html).toMatch(/height:\s*auto/)
    article.remove()
  })

  it('resolves CSS variables to concrete values before producing clipboard HTML', () => {
    const article = document.createElement('article')
    article.style.setProperty('--article-text', '#141413')
    article.innerHTML = '<p style="color:var(--article-text);background-color:var(--missing, #ffffff)">正文</p>'
    document.body.append(article)

    const html = serializePreviewArticle(article)

    expect(html).not.toContain('var(--')
    expect(html).toContain('color:#141413')
    expect(html).toContain('background-color:#ffffff')
    article.remove()
  })

  it('turns list markers into inline content that keeps its custom color', () => {
    const article = document.createElement('article')
    article.innerHTML = '<ul><li style="--article-list-marker:#9c4f3d">条目</li></ul>'
    document.body.append(article)

    const html = serializePreviewArticle(article)

    expect(html).toContain('color: rgb(156, 79, 61)')
    expect(html).toContain('>•</span>')
    article.remove()
  })

  it('replaces temporary local image urls before copying rich text', async () => {
    const html = '<article><img src="blob:http://localhost/image-1" alt="封面"></article>'

    await expect(makeImageSourcesPortable(html, async (src) => src.includes('image-1') ? 'data:image/png;base64,aW1hZ2U=' : undefined))
      .resolves.toContain('src="data:image/png;base64,aW1hZ2U="')
  })

  it('keeps an unresolved blob URL for structured validation when image conversion fails', async () => {
    const html = '<article><img src="blob:http://localhost/missing" alt="失效图片"></article>'

    await expect(makeImageSourcesPortable(html, async () => { throw new Error('读取失败') }))
      .resolves.toContain('src="blob:http://localhost/missing"')
  })

  it('prepares the exact portable HTML that will be validated and copied', async () => {
    const article = document.createElement('article')
    article.innerHTML = '<p>正文</p><img src="blob:http://localhost/image-2" alt="配图">'
    document.body.append(article)

    const html = await preparePreviewArticleForClipboard(article, async (source) => source.includes('image-2')
      ? 'data:image/png;base64,aW1hZ2U='
      : undefined)

    expect(html).toContain('<p')
    expect(html).toContain('src="data:image/png;base64,aW1hZ2U="')
    expect(html).not.toContain('blob:')
    article.remove()
  })

  it('writes the already validated HTML bytes without serializing the live preview again', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    class TestClipboardItem {
      constructor(public readonly data: Record<string, Blob>) {}
    }
    vi.stubGlobal('ClipboardItem', TestClipboardItem)
    vi.stubGlobal('navigator', { clipboard: { write } })

    const html = '<article><p>已检查内容</p></article>'
    await copyPreparedArticle(html, '# 已检查内容')

    const item = write.mock.calls[0][0][0] as TestClipboardItem
    const copiedHtml = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => resolve(String(reader.result)))
      reader.addEventListener('error', () => reject(reader.error))
      reader.readAsText(item.data['text/html'])
    })
    expect(copiedHtml).toBe(html)
  })

  it('fails instead of silently copying Markdown when rich clipboard writing is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await expect(copyPreparedArticle('<article><p>已检查内容</p></article>', '# 已检查内容'))
      .rejects.toThrow('富文本')

    expect(writeText).not.toHaveBeenCalled()
  })
})
