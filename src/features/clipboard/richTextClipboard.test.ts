import { serializePreviewArticle } from './richTextClipboard'

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
})
