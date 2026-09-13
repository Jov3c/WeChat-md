import { collectImageAssetIds, createImageMarkdown, localizeRemoteMarkdownImages, removeImageAssetReference, replaceImageAssetUrls } from './assetMarkdown'

describe('image asset markdown references', () => {
  it('creates an encoded asset reference without allowing alt text to break markdown', () => {
    expect(createImageMarkdown('asset-1', '封面 [最终版]')).toBe('![封面 \\[最终版\\]](asset://asset-1)')
  })

  it('collects unique resource ids from image references only', () => {
    const markdown = ['![封面](asset://cover)', '[普通链接](asset://not-image)', '![重复](asset://cover)', '![正文](asset://body-2)'].join('\n')

    expect(collectImageAssetIds(markdown)).toEqual(['cover', 'body-2'])
  })

  it('replaces resolved image references while preserving unresolved resources', () => {
    const markdown = '![封面](asset://cover)\n\n![缺失](asset://missing)'

    expect(replaceImageAssetUrls(markdown, { cover: 'blob:http://localhost/cover' }))
      .toBe('![封面](blob:http://localhost/cover)\n\n![缺失](asset://missing)')
  })

  it('removes only the requested image reference and collapses the leftover gap', () => {
    expect(removeImageAssetReference('正文\n\n![图](asset://remove-me)\n\n结尾', 'remove-me')).toBe('正文\n\n结尾')
  })

  it('localizes repeated network images once and reports failed downloads', async () => {
    const importer = vi.fn(async (url: string) => {
      if (url.includes('bad')) throw new Error('failed')
      return 'local-cover'
    })
    const markdown = '![封面](https://img.example.com/a.png)\n![重复](https://img.example.com/a.png)\n![失败](https://img.example.com/bad.png)'

    const result = await localizeRemoteMarkdownImages(markdown, importer)

    expect(result.markdown).toBe('![封面](asset://local-cover)\n![重复](asset://local-cover)\n![失败](https://img.example.com/bad.png)')
    expect(result.failedUrls).toEqual(['https://img.example.com/bad.png'])
    expect(importer).toHaveBeenCalledTimes(2)
  })
})
