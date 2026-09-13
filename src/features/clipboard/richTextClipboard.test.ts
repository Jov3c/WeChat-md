import { makeImageSourcesPortable, serializePreviewArticle } from './richTextClipboard'

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
})
