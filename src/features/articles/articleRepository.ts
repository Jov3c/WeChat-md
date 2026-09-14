import type { StylePreset } from '../styles/stylePresets'
import type { ArticleTemplate } from '../templates/templatePresets'
import type { ContentComponent } from '../components/contentComponents'
import { openWechatDatabase, WORKSPACE_STORE } from '../storage/browserDatabase'

export interface StoredArticle {
  id: string
  title: string
  date: string
  content: string
  styleId?: string
  templateId?: string
  favorite?: boolean
  source?: 'local' | 'imported' | 'wechat'
  status?: 'draft' | 'published' | 'trash'
  titleMode?: 'auto' | 'manual'
  author?: string
  sourceUrl?: string
  importedAt?: string
  originalHtml?: string
}

export interface ArticleLibrarySnapshot {
  articles: StoredArticle[]
  selectedId: string
  styles?: StylePreset[]
  templates?: ArticleTemplate[]
  components?: ContentComponent[]
  wechatArticleSavePolicy?: 'ask' | 'always' | 'never'
  syncEnabled?: boolean
}

export interface ArticleRepository {
  load: () => Promise<ArticleLibrarySnapshot | null>
  save: (snapshot: ArticleLibrarySnapshot) => Promise<void>
}

export interface IndexedDbArticleRepositoryOptions {
  indexedDB: IDBFactory
  databaseName?: string
}

function cloneSnapshot(snapshot: ArticleLibrarySnapshot): ArticleLibrarySnapshot {
  return {
    articles: snapshot.articles.map((article) => ({ ...article })),
    selectedId: snapshot.selectedId,
    styles: snapshot.styles?.map((preset) => ({
      ...preset,
      global: { ...preset.global },
      headings: { h1: { ...preset.headings.h1 }, h2: { ...preset.headings.h2 }, h3: { ...preset.headings.h3 } },
      components: Object.fromEntries(Object.entries(preset.components).map(([key, value]) => [key, { ...value }])) as unknown as StylePreset['components'],
    })),
    templates: snapshot.templates?.map((template) => ({ ...template })),
    components: snapshot.components?.map((component) => ({ ...component })),
    wechatArticleSavePolicy: snapshot.wechatArticleSavePolicy,
    syncEnabled: snapshot.syncEnabled,
  }
}

export function createMemoryArticleRepository(initialSnapshot: ArticleLibrarySnapshot | null = null): ArticleRepository {
  let snapshot = initialSnapshot ? cloneSnapshot(initialSnapshot) : null

  return {
    async load() {
      return snapshot ? cloneSnapshot(snapshot) : null
    },
    async save(nextSnapshot) {
      snapshot = cloneSnapshot(nextSnapshot)
    },
  }
}

export function createBrowserArticleRepository(): ArticleRepository | null {
  if (typeof globalThis.indexedDB === 'undefined') return null
  return createIndexedDbArticleRepository({ indexedDB: globalThis.indexedDB })
}

const LIBRARY_KEY = 'article-library'

export function createIndexedDbArticleRepository({
  indexedDB,
  databaseName = 'wechat-md',
}: IndexedDbArticleRepositoryOptions): ArticleRepository {
  return {
    async load() {
      const database = await openWechatDatabase(indexedDB, databaseName)
      try {
        return await new Promise<ArticleLibrarySnapshot | null>((resolve, reject) => {
          const request = database.transaction(WORKSPACE_STORE, 'readonly').objectStore(WORKSPACE_STORE).get(LIBRARY_KEY)
          request.addEventListener('success', () => resolve((request.result as ArticleLibrarySnapshot | undefined) ?? null))
          request.addEventListener('error', () => reject(request.error ?? new Error('无法读取本地文章库')))
        })
      } finally {
        database.close()
      }
    },

    async save(snapshot) {
      const database = await openWechatDatabase(indexedDB, databaseName)
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(WORKSPACE_STORE, 'readwrite')
          transaction.objectStore(WORKSPACE_STORE).put(snapshot, LIBRARY_KEY)
          transaction.addEventListener('complete', () => resolve())
          transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('无法保存本地文章库')))
          transaction.addEventListener('error', () => reject(transaction.error ?? new Error('无法保存本地文章库')))
        })
      } finally {
        database.close()
      }
    },
  }
}
