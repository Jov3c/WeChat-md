import { openWechatDatabase, VERSION_STORE } from '../storage/browserDatabase'
import type { ArticleVersion } from './articleVersions'

const MAX_VERSIONS_PER_ARTICLE = 50

export interface VersionRepository {
  save: (version: ArticleVersion) => Promise<void>
  list: (articleId: string) => Promise<ArticleVersion[]>
  listAll: () => Promise<ArticleVersion[]>
  get: (id: string) => Promise<ArticleVersion | null>
  deleteForArticle: (articleId: string) => Promise<void>
}

export interface IndexedDbVersionRepositoryOptions {
  indexedDB: IDBFactory
  databaseName?: string
}

function newestFirst(versions: ArticleVersion[]) {
  return [...versions].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export function createMemoryVersionRepository(initialVersions: ArticleVersion[] = []): VersionRepository {
  const versions = new Map(initialVersions.map((version) => [version.id, { ...version }]))
  const prune = (articleId: string) => newestFirst(Array.from(versions.values()).filter((version) => version.articleId === articleId))
    .slice(MAX_VERSIONS_PER_ARTICLE)
    .forEach((version) => versions.delete(version.id))
  return {
    async save(version) { versions.set(version.id, { ...version }); prune(version.articleId) },
    async list(articleId) { return newestFirst(Array.from(versions.values()).filter((version) => version.articleId === articleId)).map((version) => ({ ...version })) },
    async listAll() { return newestFirst(Array.from(versions.values())).map((version) => ({ ...version })) },
    async get(id) { return versions.has(id) ? { ...versions.get(id)! } : null },
    async deleteForArticle(articleId) { Array.from(versions.values()).filter((version) => version.articleId === articleId).forEach((version) => versions.delete(version.id)) },
  }
}

export function createBrowserVersionRepository(): VersionRepository | null {
  if (typeof globalThis.indexedDB === 'undefined') return null
  return createIndexedDbVersionRepository({ indexedDB: globalThis.indexedDB })
}

export function createIndexedDbVersionRepository({ indexedDB, databaseName = 'wechat-md' }: IndexedDbVersionRepositoryOptions): VersionRepository {
  const request = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) => {
    const database = await openWechatDatabase(indexedDB, databaseName)
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(VERSION_STORE, mode)
        const operation = run(transaction.objectStore(VERSION_STORE))
        operation.addEventListener('success', () => resolve(operation.result))
        operation.addEventListener('error', () => reject(operation.error ?? new Error('无法读写文章版本')))
        transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('无法读写文章版本')))
      })
    } finally {
      database.close()
    }
  }

  const repository: VersionRepository = {
    async save(version) {
      await request('readwrite', (store) => store.put(version))
      const versions = await repository.list(version.articleId)
      await Promise.all(versions.slice(MAX_VERSIONS_PER_ARTICLE).map((oldVersion) => request('readwrite', (store) => store.delete(oldVersion.id))))
    },
    async list(articleId) {
      const versions = await request('readonly', (store) => store.index('articleId').getAll(articleId)) as ArticleVersion[]
      return newestFirst(versions)
    },
    async listAll() {
      return newestFirst(await request('readonly', (store) => store.getAll()) as ArticleVersion[])
    },
    async get(id) {
      return (await request('readonly', (store) => store.get(id)) as ArticleVersion | undefined) ?? null
    },
    async deleteForArticle(articleId) {
      const versions = await repository.list(articleId)
      await Promise.all(versions.map((version) => request('readwrite', (store) => store.delete(version.id))))
    },
  }
  return repository
}
