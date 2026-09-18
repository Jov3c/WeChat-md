import { useCallback, useEffect, useRef, useState } from 'react'
import type { StoredArticle } from '../../features/articles/articleRepository'
import { isRecoverableSnapshot, type RecoveryRepository, type RecoverySnapshot } from '../../features/recovery/recoveryRepository'

export interface UseRecoveryOptions {
  repository: RecoveryRepository | null
  articles: StoredArticle[]
  currentArticle?: StoredArticle
  enabled: boolean
  delay?: number
}

function articleSignature(article: Pick<StoredArticle, 'title' | 'content' | 'styleId' | 'layoutId'>): string {
  return JSON.stringify({
    title: article.title,
    content: article.content,
    styleId: article.styleId ?? 'default',
    layoutId: article.layoutId ?? 'standard',
  })
}

export function useRecovery({ repository, articles, currentArticle, enabled, delay = 2000 }: UseRecoveryOptions) {
  const [pendingRecovery, setPendingRecovery] = useState<RecoverySnapshot | null>(null)
  const [ready, setReady] = useState(repository === null)
  const signaturesRef = useRef(new Map<string, string>())
  const savedAtRef = useRef<string | undefined>(undefined)
  const latestArticleRef = useRef(currentArticle)
  latestArticleRef.current = currentArticle

  useEffect(() => {
    if (!repository || !enabled) return
    let active = true
    signaturesRef.current = new Map(articles.map((article) => [article.id, articleSignature(article)]))
    repository.load()
      .then(async (snapshot) => {
        if (!active) return
        savedAtRef.current = snapshot?.savedAt ?? new Date().toISOString()
        if (snapshot && isRecoverableSnapshot(snapshot, articles)) {
          setPendingRecovery(snapshot)
        } else {
          setPendingRecovery(null)
          if (snapshot) await repository.delete()
        }
      })
      .catch(() => { if (active) setPendingRecovery(null) })
      .finally(() => { if (active) setReady(true) })
    return () => { active = false }
    // Recovery is initialized once from the formally loaded workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, repository])

  useEffect(() => {
    if (!repository || !enabled || !ready || pendingRecovery || !currentArticle) return
    const signature = articleSignature(currentArticle)
    const previousSignature = signaturesRef.current.get(currentArticle.id)
    if (previousSignature === undefined) {
      signaturesRef.current.set(currentArticle.id, signature)
      return
    }
    if (previousSignature === signature) return
    signaturesRef.current.set(currentArticle.id, signature)

    const snapshot: RecoverySnapshot = {
      articleId: currentArticle.id,
      title: currentArticle.title,
      content: currentArticle.content,
      styleId: currentArticle.styleId,
      layoutId: currentArticle.layoutId,
      updatedAt: new Date().toISOString(),
      savedAt: savedAtRef.current,
    }
    const timeout = window.setTimeout(() => { void repository.save(snapshot) }, delay)
    return () => window.clearTimeout(timeout)
  }, [currentArticle?.content, currentArticle?.id, currentArticle?.layoutId, currentArticle?.styleId, currentArticle?.title, delay, enabled, pendingRecovery, ready, repository])

  const ignoreRecovery = useCallback(async () => {
    setPendingRecovery(null)
    await repository?.delete()
  }, [repository])

  const acceptRecovery = useCallback(() => {
    const snapshot = pendingRecovery
    setPendingRecovery(null)
    return snapshot
  }, [pendingRecovery])

  const markFormallySaved = useCallback(async (savedAt = new Date().toISOString()) => {
    savedAtRef.current = savedAt
    await repository?.markSaved(savedAt)
  }, [repository])

  return {
    pendingRecovery,
    recoveryReady: ready,
    ignoreRecovery,
    acceptRecovery,
    markFormallySaved,
  }
}
