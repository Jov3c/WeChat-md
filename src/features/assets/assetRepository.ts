import { ASSET_STORE, openWechatDatabase } from '../storage/browserDatabase'

export type ImageAssetSource = 'file' | 'paste' | 'drop' | 'remote' | 'wechat'

export interface ImageAsset {
  id: string
  name: string
  mimeType: string
  size: number
  createdAt: string
  source: ImageAssetSource
  sourceUrl?: string
  unused?: boolean
}

export interface StoredImageAsset extends ImageAsset {
  blob: Blob
}

export interface AssetRepository {
  save: (asset: StoredImageAsset) => Promise<void>
  get: (id: string) => Promise<StoredImageAsset | null>
  list: () => Promise<ImageAsset[]>
  setUnused: (id: string, unused: boolean) => Promise<void>
  delete: (id: string) => Promise<void>
}

export interface IndexedDbAssetRepositoryOptions {
  indexedDB: IDBFactory
  databaseName?: string
}

function metadata(asset: StoredImageAsset): ImageAsset {
  const { blob: _blob, ...rest } = asset
  return { ...rest }
}

function cloneAsset(asset: StoredImageAsset): StoredImageAsset {
  return { ...asset, blob: asset.blob.slice(0, asset.blob.size, asset.blob.type) }
}

export function createMemoryAssetRepository(initialAssets: StoredImageAsset[] = []): AssetRepository {
  const assets = new Map(initialAssets.map((asset) => [asset.id, cloneAsset(asset)]))
  return {
    async save(asset) { assets.set(asset.id, cloneAsset(asset)) },
    async get(id) { return assets.has(id) ? cloneAsset(assets.get(id)!) : null },
    async list() { return Array.from(assets.values(), metadata).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) },
    async setUnused(id, unused) {
      const asset = assets.get(id)
      if (asset) assets.set(id, { ...asset, unused })
    },
    async delete(id) { assets.delete(id) },
  }
}

export function createBrowserAssetRepository(): AssetRepository | null {
  if (typeof globalThis.indexedDB === 'undefined') return null
  return createIndexedDbAssetRepository({ indexedDB: globalThis.indexedDB })
}

export function createIndexedDbAssetRepository({
  indexedDB,
  databaseName = 'wechat-md',
}: IndexedDbAssetRepositoryOptions): AssetRepository {
  const withStore = async <T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
  ) => {
    const database = await openWechatDatabase(indexedDB, databaseName)
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(ASSET_STORE, mode)
        operation(transaction.objectStore(ASSET_STORE), resolve, reject)
        transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('无法更新图片资源')))
        transaction.addEventListener('error', () => reject(transaction.error ?? new Error('无法更新图片资源')))
      })
    } finally {
      database.close()
    }
  }

  return {
    save(asset) {
      return withStore<void>('readwrite', (store, resolve, reject) => {
        const request = store.put(asset)
        request.addEventListener('success', () => resolve())
        request.addEventListener('error', () => reject(request.error))
      })
    },
    get(id) {
      return withStore<StoredImageAsset | null>('readonly', (store, resolve, reject) => {
        const request = store.get(id)
        request.addEventListener('success', () => resolve((request.result as StoredImageAsset | undefined) ?? null))
        request.addEventListener('error', () => reject(request.error))
      })
    },
    list() {
      return withStore<ImageAsset[]>('readonly', (store, resolve, reject) => {
        const request = store.getAll()
        request.addEventListener('success', () => resolve((request.result as StoredImageAsset[]).map(metadata).sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
        request.addEventListener('error', () => reject(request.error))
      })
    },
    async setUnused(id, unused) {
      const asset = await this.get(id)
      if (asset) await this.save({ ...asset, unused })
    },
    delete(id) {
      return withStore<void>('readwrite', (store, resolve, reject) => {
        const request = store.delete(id)
        request.addEventListener('success', () => resolve())
        request.addEventListener('error', () => reject(request.error))
      })
    },
  }
}
