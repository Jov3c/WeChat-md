import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryAssetRepository } from '../../features/assets/assetRepository'
import { useAssets } from './useAssets'

describe('useAssets', () => {
  it('stores imported image files and inserts their asset markdown', async () => {
    const repository = createMemoryAssetRepository()
    const onInsertText = vi.fn()
    const onNotify = vi.fn()
    const { result } = renderHook(() => useAssets({
      repository,
      articles: [{ id: 'article-1', title: '文章', date: '刚刚', content: '' }],
      selectedId: 'article-1',
      content: '',
      onInsertText,
      onContentChange: vi.fn(),
      onNotify,
    }))

    const file = new File([new Uint8Array([137, 80, 78, 71])], '封面.png', { type: 'image/png' })
    await act(async () => { await result.current.importImageFiles([file], 'file') })

    const stored = await repository.list()
    expect(stored).toHaveLength(1)
    expect(stored[0].name).toBe('封面.png')
    expect(onInsertText).toHaveBeenCalledWith(expect.stringMatching(/^!\[封面\]\(asset:\/\/.+\)$/))
    expect(onNotify).toHaveBeenCalledWith('图片已插入')
  })
})
