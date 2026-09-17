import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArticleLibrarySnapshot, ArticleRepository } from '../../features/articles/articleRepository'
import { useAutosave } from './useAutosave'

const firstSnapshot: ArticleLibrarySnapshot = {
  articles: [{ id: 'article-1', title: '第一版', date: '刚刚', content: '# 第一版' }],
  selectedId: 'article-1',
  styles: [],
  templates: [],
  components: [],
  wechatArticleSavePolicy: 'ask',
  syncEnabled: true,
}

describe('useAutosave', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('debounces changes and persists the latest workspace snapshot', async () => {
    const saved: ArticleLibrarySnapshot[] = []
    const repository: ArticleRepository = {
      async load() { return null },
      async save(snapshot) { saved.push(snapshot) },
    }
    const secondSnapshot: ArticleLibrarySnapshot = {
      ...firstSnapshot,
      articles: [{ ...firstSnapshot.articles[0], title: '第二版', content: '# 第二版' }],
    }
    const { result, rerender } = renderHook(
      ({ snapshot }) => useAutosave({ repository, snapshot, enabled: true, delay: 5000 }),
      { initialProps: { snapshot: firstSnapshot } },
    )

    rerender({ snapshot: secondSnapshot })
    await act(async () => { await vi.advanceTimersByTimeAsync(4999) })
    expect(saved).toEqual([])

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.saveStatus).toBe('saved')
    expect(saved).toHaveLength(1)
    expect(saved[0].articles[0].content).toBe('# 第二版')
    expect(result.current.savedAt).toBeInstanceOf(Date)
  })

  it('flushes the latest snapshot when the page is hidden', async () => {
    const saved: ArticleLibrarySnapshot[] = []
    const repository: ArticleRepository = {
      async load() { return null },
      async save(snapshot) { saved.push(snapshot) },
    }
    renderHook(() => useAutosave({ repository, snapshot: firstSnapshot, enabled: true, delay: 5000 }))

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(saved).toHaveLength(1)
    expect(saved[0].selectedId).toBe('article-1')
  })
})
