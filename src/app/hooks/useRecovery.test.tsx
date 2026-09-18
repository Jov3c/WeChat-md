import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoredArticle } from '../../features/articles/articleRepository'
import { createMemoryRecoveryRepository } from '../../features/recovery/recoveryRepository'
import { useRecovery } from './useRecovery'

const article: StoredArticle = {
  id: 'article-1', title: '正式标题', date: '今天', content: '# 正式正文',
  styleId: 'default', layoutId: 'standard',
}

describe('useRecovery', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('offers a newer unsaved snapshot and deletes it when ignored', async () => {
    const repository = createMemoryRecoveryRepository({
      articleId: article.id, title: '未保存标题', content: '# 未保存正文',
      styleId: 'warm', layoutId: 'tutorial',
      updatedAt: '2026-09-18T08:00:05.000Z', savedAt: '2026-09-18T08:00:00.000Z',
    })
    const { result } = renderHook(() => useRecovery({
      repository, articles: [article], currentArticle: article, enabled: true, delay: 2000,
    }))

    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(result.current.pendingRecovery?.title).toBe('未保存标题')
    await act(async () => { await result.current.ignoreRecovery() })

    expect(result.current.pendingRecovery).toBeNull()
    await expect(repository.load()).resolves.toBeNull()
  })

  it('writes changed content after two seconds and marks it formally saved', async () => {
    const repository = createMemoryRecoveryRepository()
    const { result, rerender } = renderHook(
      ({ currentArticle }) => useRecovery({ repository, articles: [article], currentArticle, enabled: true, delay: 2000 }),
      { initialProps: { currentArticle: article } },
    )
    await act(async () => { await Promise.resolve() })

    rerender({ currentArticle: { ...article, content: '# 正在输入' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(1999) })
    await expect(repository.load()).resolves.toBeNull()

    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    await expect(repository.load()).resolves.toMatchObject({ articleId: article.id, content: '# 正在输入' })

    await act(async () => { await result.current.markFormallySaved('2026-09-18T08:00:10.000Z') })
    await expect(repository.load()).resolves.toMatchObject({ savedAt: '2026-09-18T08:00:10.000Z' })
  })

  it('returns the accepted snapshot without deleting it before normal autosave', async () => {
    const recovery = {
      articleId: article.id, title: '恢复标题', content: '# 恢复正文',
      updatedAt: '2026-09-18T08:00:05.000Z', savedAt: '2026-09-18T08:00:00.000Z',
    }
    const repository = createMemoryRecoveryRepository(recovery)
    const { result } = renderHook(() => useRecovery({ repository, articles: [article], currentArticle: article, enabled: true, delay: 2000 }))
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(result.current.pendingRecovery).not.toBeNull()

    let accepted
    act(() => { accepted = result.current.acceptRecovery() })

    expect(accepted).toEqual(recovery)
    expect(result.current.pendingRecovery).toBeNull()
    await expect(repository.load()).resolves.toEqual(recovery)
  })
})
