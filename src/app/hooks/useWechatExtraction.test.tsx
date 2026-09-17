import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { builtInStylePresets } from '../../features/styles/stylePresets'
import type { StoredImageAsset } from '../../features/assets/assetRepository'
import { useWechatExtraction } from './useWechatExtraction'

describe('useWechatExtraction', () => {
  it('localizes extracted images before adding the article', async () => {
    const asset: StoredImageAsset = {
      id: 'asset-1',
      name: '公众号图片.png',
      mimeType: 'image/png',
      size: 4,
      createdAt: '2026-09-17T09:00:00.000Z',
      source: 'wechat',
      sourceUrl: 'https://example.com/image.png',
      blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' }),
    }
    const onArticleSaved = vi.fn()
    const onNotify = vi.fn()
    const { result } = renderHook(() => useWechatExtraction({
      extractor: vi.fn(),
      activeStyle: builtInStylePresets[0],
      selectedId: 'article-1',
      createArticleId: () => 'wechat-article-1',
      saveRemoteAsset: async () => asset,
      onArticleSaved,
      onStyleDraftChange: vi.fn(),
      onStyleSaved: vi.fn(),
      onOpenLayoutSettings: vi.fn(),
      onNotify,
    }))

    await act(async () => {
      await result.current.saveWechatArticle({
        title: '测试文章',
        author: '作者',
        sourceUrl: 'https://mp.weixin.qq.com/s/example',
        markdown: '正文\n\n![图片](https://example.com/image.png)',
        html: '<p>正文</p>',
        tokens: [],
        components: [],
      })
    })

    expect(onArticleSaved).toHaveBeenCalledWith(expect.objectContaining({
      id: 'wechat-article-1',
      title: '测试文章',
      content: expect.stringContaining('asset://asset-1'),
    }))
    expect(onNotify).toHaveBeenCalledWith('已保存公众号文章“测试文章”')
  })
})
