import Database from '@tauri-apps/plugin-sql'
import { createSqliteArticleRepository, createSqliteAssetRepository, createSqliteVersionRepository } from '../features/storage/sqliteRepositories'
import { extractWechatArticle } from '../features/wechat/wechatExtraction'
import type { RuntimeServices } from './contracts'

export async function createDesktopServices(): Promise<RuntimeServices> {
  try {
    const database = await Database.load('sqlite:wechat-md.db')
    return {
      kind: 'desktop',
      articleRepository: createSqliteArticleRepository(database),
      assetRepository: createSqliteAssetRepository(database),
      versionRepository: createSqliteVersionRepository(database),
      extractWechatArticle,
      databasePath: database.path,
    }
  } catch (reason) {
    const error = new Error('桌面数据无法打开', { cause: reason })
    Object.assign(error, { databasePath: 'sqlite:wechat-md.db' })
    throw error
  }
}
