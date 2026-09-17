import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryVersionRepository } from '../../features/versions/versionRepository'
import type { ArticleVersion } from '../../features/versions/articleVersions'
import { builtInStylePresets } from '../../features/styles/stylePresets'
import type { ArticleItem } from '../demoData'
import { useVersions } from './useVersions'

const currentArticle: ArticleItem = {
  id: 'article-1',
  title: '当前标题',
  date: '刚刚',
  content: '# 当前正文',
  styleId: 'default',
}

const previousVersion: ArticleVersion = {
  id: 'version-1',
  articleId: 'article-1',
  title: '历史标题',
  content: '# 历史正文',
  styleId: 'default',
  createdAt: '2026-09-17T08:00:00.000Z',
  reason: 'manual',
}

describe('useVersions', () => {
  it('does not create a duplicate version when the article is unchanged', async () => {
    const matchingVersion = {
      ...previousVersion,
      title: currentArticle.title,
      content: currentArticle.content,
      styleSnapshot: builtInStylePresets[0],
    }
    const repository = createMemoryVersionRepository([matchingVersion])
    const { result } = renderHook(() => useVersions({
      repository,
      articles: [currentArticle],
      selectedId: currentArticle.id,
      stylePresets: builtInStylePresets,
      storageReady: true,
    }))

    await act(async () => { await result.current.saveVersionIfChanged('manual', currentArticle) })

    await expect(repository.list(currentArticle.id)).resolves.toHaveLength(1)
  })

  it('archives the current article before restoring a historical version', async () => {
    const repository = createMemoryVersionRepository([previousVersion])
    const onRestoreVersion = vi.fn()
    const { result } = renderHook(() => useVersions({
      repository,
      articles: [currentArticle],
      selectedId: currentArticle.id,
      stylePresets: builtInStylePresets,
      storageReady: true,
      onRestoreVersion,
    }))

    await act(async () => { await result.current.restoreArticleVersion(previousVersion.id) })

    expect(onRestoreVersion).toHaveBeenCalledWith(previousVersion)
    const versions = await repository.list(currentArticle.id)
    expect(versions.some((version) => version.reason === 'restore' && version.content === '# 当前正文')).toBe(true)
  })
})
