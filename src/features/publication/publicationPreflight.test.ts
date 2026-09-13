import { describe, expect, it } from 'vitest'
import { inspectPublication } from './publicationPreflight'

describe('publication preflight', () => {
  it('reports missing, failed, unresolved and incompatible content before copying', () => {
    const article = document.createElement('article')
    article.innerHTML = '<img><img src="broken.png"><img src="asset://local-image"><p>正文</p>'
    const [, broken] = Array.from(article.querySelectorAll('img'))
    Object.defineProperties(broken, {
      complete: { configurable: true, value: true },
      naturalWidth: { configurable: true, value: 0 },
    })

    expect(inspectPublication(article, '<iframe src="https://example.com"></iframe>')).toEqual([
      { code: 'missing-image', message: '有 1 张图片缺少地址' },
      { code: 'failed-image', message: '有 1 张图片加载失败' },
      { code: 'unresolved-asset', message: '有 1 张本地图片尚未转换' },
      { code: 'incompatible-content', message: '文章包含公众号可能不支持的内容' },
    ])
  })

  it('does not block a normal article or an image that is still loading', () => {
    const article = document.createElement('article')
    article.innerHTML = '<p>正文</p><img src="https://example.com/loading.png">'

    expect(inspectPublication(article, '# 正文')).toEqual([])
  })
})
