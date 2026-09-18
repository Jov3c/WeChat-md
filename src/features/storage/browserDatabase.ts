export const DATABASE_VERSION = 4
export const WORKSPACE_STORE = 'workspace'
export const ASSET_STORE = 'assets'
export const VERSION_STORE = 'versions'
export const RECOVERY_STORE = 'recovery'

export function openWechatDatabase(indexedDB: IDBFactory, databaseName: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, DATABASE_VERSION)
    request.addEventListener('upgradeneeded', () => {
      if (!request.result.objectStoreNames.contains(WORKSPACE_STORE)) {
        request.result.createObjectStore(WORKSPACE_STORE)
      }
      if (!request.result.objectStoreNames.contains(ASSET_STORE)) {
        request.result.createObjectStore(ASSET_STORE, { keyPath: 'id' })
      }
      if (!request.result.objectStoreNames.contains(VERSION_STORE)) {
        const versions = request.result.createObjectStore(VERSION_STORE, { keyPath: 'id' })
        versions.createIndex('articleId', 'articleId')
      }
      if (!request.result.objectStoreNames.contains(RECOVERY_STORE)) {
        request.result.createObjectStore(RECOVERY_STORE)
      }
    })
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error ?? new Error('无法打开本地数据')))
  })
}
