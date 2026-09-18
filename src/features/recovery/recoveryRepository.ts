import type { StoredArticle } from '../articles/articleRepository'
import type { ArticleLayoutId } from '../layouts/articleLayouts'
import { openWechatDatabase, RECOVERY_STORE } from '../storage/browserDatabase'

export interface RecoverySnapshot {
  articleId: string
  title: string
  content: string
  styleId?: string
  layoutId?: ArticleLayoutId
  updatedAt: string
  savedAt?: string
}

export interface RecoveryRepository {
  load: () => Promise<RecoverySnapshot | null>
  save: (snapshot: RecoverySnapshot) => Promise<void>
  markSaved: (savedAt: string) => Promise<void>
  delete: () => Promise<void>
}

export interface IndexedDbRecoveryRepositoryOptions {
  indexedDB: IDBFactory
  databaseName?: string
}

function cloneSnapshot(snapshot: RecoverySnapshot): RecoverySnapshot {
  return { ...snapshot }
}

export function createMemoryRecoveryRepository(initialSnapshot: RecoverySnapshot | null = null): RecoveryRepository {
  let snapshot = initialSnapshot ? cloneSnapshot(initialSnapshot) : null

  return {
    async load() {
      return snapshot ? cloneSnapshot(snapshot) : null
    },
    async save(nextSnapshot) {
      snapshot = cloneSnapshot(nextSnapshot)
    },
    async markSaved(savedAt) {
      if (snapshot) snapshot = { ...snapshot, savedAt }
    },
    async delete() {
      snapshot = null
    },
  }
}

const RECOVERY_KEY = 'current'

export function createIndexedDbRecoveryRepository({
  indexedDB,
  databaseName = 'wechat-md',
}: IndexedDbRecoveryRepositoryOptions): RecoveryRepository {
  async function withDatabase<T>(operation: (database: IDBDatabase) => Promise<T>): Promise<T> {
    const database = await openWechatDatabase(indexedDB, databaseName)
    try {
      return await operation(database)
    } finally {
      database.close()
    }
  }

  const repository: RecoveryRepository = {
    load() {
      return withDatabase((database) => new Promise<RecoverySnapshot | null>((resolve, reject) => {
        const request = database.transaction(RECOVERY_STORE, 'readonly').objectStore(RECOVERY_STORE).get(RECOVERY_KEY)
        request.addEventListener('success', () => resolve((request.result as RecoverySnapshot | undefined) ?? null))
        request.addEventListener('error', () => reject(request.error ?? new Error('无法读取恢复草稿')))
      }))
    },
    save(snapshot) {
      return withDatabase((database) => new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(RECOVERY_STORE, 'readwrite')
        transaction.objectStore(RECOVERY_STORE).put(cloneSnapshot(snapshot), RECOVERY_KEY)
        transaction.addEventListener('complete', () => resolve())
        transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('无法保存恢复草稿')))
        transaction.addEventListener('error', () => reject(transaction.error ?? new Error('无法保存恢复草稿')))
      }))
    },
    async markSaved(savedAt) {
      const snapshot = await repository.load()
      if (snapshot) await repository.save({ ...snapshot, savedAt })
    },
    delete() {
      return withDatabase((database) => new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(RECOVERY_STORE, 'readwrite')
        transaction.objectStore(RECOVERY_STORE).delete(RECOVERY_KEY)
        transaction.addEventListener('complete', () => resolve())
        transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('无法删除恢复草稿')))
        transaction.addEventListener('error', () => reject(transaction.error ?? new Error('无法删除恢复草稿')))
      }))
    },
  }

  return repository
}

export function createBrowserRecoveryRepository(): RecoveryRepository | null {
  if (typeof globalThis.indexedDB === 'undefined') return null
  return createIndexedDbRecoveryRepository({ indexedDB: globalThis.indexedDB })
}

export function isRecoverableSnapshot(snapshot: RecoverySnapshot, articles: StoredArticle[]): boolean {
  const updatedAt = Date.parse(snapshot.updatedAt)
  if (!Number.isFinite(updatedAt)) return false

  if (snapshot.savedAt) {
    const savedAt = Date.parse(snapshot.savedAt)
    if (!Number.isFinite(savedAt) || updatedAt <= savedAt) return false
  }

  const article = articles.find((candidate) => candidate.id === snapshot.articleId)
  if (!article) return false

  return article.title !== snapshot.title
    || article.content !== snapshot.content
    || (article.styleId ?? 'default') !== (snapshot.styleId ?? 'default')
    || (article.layoutId ?? 'standard') !== (snapshot.layoutId ?? 'standard')
}
