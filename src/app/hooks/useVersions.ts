import { useCallback, useEffect, useRef, useState } from 'react'
import type { ArticleLibrarySnapshot } from '../../features/articles/articleRepository'
import type { StylePreset } from '../../features/styles/stylePresets'
import {
  createArticleVersion,
  shouldCreateAutomaticVersion,
  type ArticleVersion,
  type ArticleVersionReason,
  type VersionableArticleState,
} from '../../features/versions/articleVersions'
import type { VersionRepository } from '../../features/versions/versionRepository'
import { createVersionWriteQueue } from '../../features/versions/versionWriteQueue'
import type { ArticleItem } from '../demoData'

export interface UseVersionsOptions {
  repository: VersionRepository | null
  articles: ArticleItem[]
  selectedId: string
  stylePresets: StylePreset[]
  storageReady: boolean
  onSelectArticle?: (articleId: string) => void
  onRestoreVersion?: (version: ArticleVersion) => void
  onNotify?: (message: string) => void
}

function versionState(article: ArticleItem, styles: StylePreset[]): VersionableArticleState {
  return {
    ...article,
    styleSnapshot: styles.find((style) => style.id === (article.styleId ?? 'default')),
  }
}

function matchesVersion(version: ArticleVersion | undefined, state: VersionableArticleState) {
  return version?.title === state.title
    && version.content === state.content
    && version.styleId === state.styleId
    && JSON.stringify(version.styleSnapshot) === JSON.stringify(state.styleSnapshot)
}

function baseline(article: ArticleItem, styles: StylePreset[], createdAt: string): ArticleVersion {
  return {
    ...createArticleVersion(article.id, versionState(article, styles), 'automatic', {
      id: `baseline-${article.id}`,
      createdAt,
    }),
  }
}

export function useVersions({
  repository,
  articles,
  selectedId,
  stylePresets,
  storageReady,
  onSelectArticle,
  onRestoreVersion,
  onNotify,
}: UseVersionsOptions) {
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)
  const [articleVersions, setArticleVersions] = useState<ArticleVersion[]>([])
  const writeQueueRef = useRef(createVersionWriteQueue())
  const stylesRef = useRef(stylePresets)
  const articlesRef = useRef(articles)
  const selectedIdRef = useRef(selectedId)
  const historyOpenRef = useRef(versionHistoryOpen)
  const onSelectArticleRef = useRef(onSelectArticle)
  const onRestoreVersionRef = useRef(onRestoreVersion)
  const onNotifyRef = useRef(onNotify)
  const baselinesRef = useRef(new Map(articles.map((article) => [
    article.id,
    baseline(article, stylePresets, new Date().toISOString()),
  ])))
  stylesRef.current = stylePresets
  articlesRef.current = articles
  selectedIdRef.current = selectedId
  historyOpenRef.current = versionHistoryOpen
  onSelectArticleRef.current = onSelectArticle
  onRestoreVersionRef.current = onRestoreVersion
  onNotifyRef.current = onNotify

  const resetBaselines = useCallback((nextArticles: ArticleItem[], nextStyles: StylePreset[]) => {
    const observedAt = new Date().toISOString()
    baselinesRef.current = new Map(nextArticles.map((article) => [
      article.id,
      baseline(article, nextStyles, observedAt),
    ]))
  }, [])

  const saveVersionIfChanged = useCallback(async (reason: ArticleVersionReason, article: ArticleItem) => {
    if (!repository || !article.content.trim()) return
    const state = versionState(article, stylesRef.current)
    return writeQueueRef.current.run(async () => {
      const latest = (await repository.list(article.id))[0]
      if (matchesVersion(latest, state)) return
      await repository.save(createArticleVersion(article.id, state, reason))
      if (historyOpenRef.current && article.id === selectedIdRef.current) {
        setArticleVersions(await repository.list(article.id))
      }
    })
  }, [repository])

  const createDueAutomaticVersions = useCallback(async (snapshot: ArticleLibrarySnapshot) => {
    if (!repository) return
    return writeQueueRef.current.run(async () => {
      for (const storedArticle of snapshot.articles) {
        const article = storedArticle as ArticleItem
        const state = versionState(article, stylesRef.current)
        const latest = (await repository.list(article.id))[0] ?? baselinesRef.current.get(article.id)
        if (!latest) {
          baselinesRef.current.set(article.id, baseline(article, stylesRef.current, new Date().toISOString()))
        } else if (shouldCreateAutomaticVersion(latest, state)) {
          await repository.save(createArticleVersion(article.id, state, 'automatic'))
        }
      }
    })
  }, [repository])

  useEffect(() => {
    if (!storageReady || !repository) return
    const interval = window.setInterval(() => {
      void createDueAutomaticVersions({ articles: articlesRef.current, selectedId: selectedIdRef.current })
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [createDueAutomaticVersions, repository, storageReady])

  const openVersionHistory = useCallback((articleId = selectedIdRef.current) => {
    if (articleId !== selectedIdRef.current && articlesRef.current.some((article) => article.id === articleId)) {
      onSelectArticleRef.current?.(articleId)
    }
    setVersionHistoryOpen(true)
    void repository?.list(articleId).then(setArticleVersions)
  }, [repository])

  const saveCurrentVersion = useCallback(async () => {
    const article = articlesRef.current.find((item) => item.id === selectedIdRef.current)
    if (!article || !repository) return
    await writeQueueRef.current.run(() => repository.save(createArticleVersion(
      article.id,
      versionState(article, stylesRef.current),
      'manual',
    )))
    setArticleVersions(await repository.list(article.id))
    onNotifyRef.current?.('已保存当前版本')
  }, [repository])

  const restoreArticleVersion = useCallback(async (versionId: string) => {
    if (!repository) return
    const article = articlesRef.current.find((item) => item.id === selectedIdRef.current)
    if (!article) return
    const target = await repository.get(versionId)
    if (!target || target.articleId !== article.id) return
    await saveVersionIfChanged('restore', article)
    onRestoreVersionRef.current?.(target)
    setArticleVersions(await repository.list(target.articleId))
    onNotifyRef.current?.('已恢复历史版本')
  }, [repository, saveVersionIfChanged])

  const deleteVersionsForArticle = useCallback(async (articleId: string) => {
    await writeQueueRef.current.run(async () => { await repository?.deleteForArticle(articleId) })
  }, [repository])

  const saveVersions = useCallback(async (versions: ArticleVersion[]) => {
    await writeQueueRef.current.run(async () => {
      for (const version of versions) await repository?.save(version)
    })
  }, [repository])

  const deleteVersionsForArticles = useCallback(async (articleIds: string[]) => {
    await writeQueueRef.current.run(async () => {
      await Promise.all(articleIds.map((articleId) => repository?.deleteForArticle(articleId)))
    })
  }, [repository])

  return {
    versionHistoryOpen,
    setVersionHistoryOpen,
    articleVersions,
    resetBaselines,
    saveVersionIfChanged,
    createDueAutomaticVersions,
    openVersionHistory,
    saveCurrentVersion,
    restoreArticleVersion,
    deleteVersionsForArticle,
    saveVersions,
    deleteVersionsForArticles,
  }
}
