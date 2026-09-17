import { useCallback, useEffect, useRef, useState } from 'react'
import type { ArticleLibrarySnapshot, ArticleRepository } from '../../features/articles/articleRepository'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface UseAutosaveOptions {
  repository: ArticleRepository | null
  snapshot: ArticleLibrarySnapshot
  enabled: boolean
  delay: number
  onSaved?: (snapshot: ArticleLibrarySnapshot) => void | Promise<void>
}

export function useAutosave({ repository, snapshot, enabled, delay, onSaved }: UseAutosaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date>()
  const latestSnapshotRef = useRef(snapshot)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const saveRequestRef = useRef(0)
  const mountedRef = useRef(true)
  const onSavedRef = useRef(onSaved)
  latestSnapshotRef.current = snapshot
  onSavedRef.current = onSaved

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const markSaving = useCallback(() => setSaveStatus('saving'), [])
  const markSaved = useCallback(() => {
    setSaveStatus('saved')
    setSavedAt(new Date())
  }, [])
  const markError = useCallback(() => setSaveStatus('error'), [])

  const saveNow = useCallback((nextSnapshot = latestSnapshotRef.current) => {
    if (!repository) return Promise.resolve()
    const request = ++saveRequestRef.current
    const operation = saveQueueRef.current
      .catch(() => undefined)
      .then(() => repository.save(nextSnapshot))
      .then(() => onSavedRef.current?.(nextSnapshot))
      .then(() => undefined)
    saveQueueRef.current = operation
    operation.then(() => {
      if (!mountedRef.current || request !== saveRequestRef.current) return
      markSaved()
    }).catch(() => {
      if (mountedRef.current && request === saveRequestRef.current) markError()
    })
    return operation
  }, [markError, markSaved, repository])

  useEffect(() => {
    if (!repository || !enabled) return
    markSaving()
    const timeout = window.setTimeout(() => { void saveNow(snapshot) }, delay)
    return () => window.clearTimeout(timeout)
  }, [delay, enabled, markSaving, repository, saveNow, snapshot])

  useEffect(() => {
    if (!repository || !enabled) return
    const flush = () => { void saveNow(latestSnapshotRef.current) }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [enabled, repository, saveNow])

  return {
    saveStatus,
    savedAt,
    latestSnapshotRef,
    markSaving,
    markSaved,
    markError,
    saveNow,
    setSaveStatus,
    setSavedAt,
  }
}
