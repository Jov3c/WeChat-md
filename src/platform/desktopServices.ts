import Database from '@tauri-apps/plugin-sql'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readFile, readTextFile, writeFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { createSqliteArticleRepository, createSqliteAssetRepository, createSqliteVersionRepository } from '../features/storage/sqliteRepositories'
import type { RuntimeServices } from './contracts'
import { createDesktopImageFetcher, createDesktopWechatExtractor } from './desktopNetwork'
import { createDesktopFileService } from './fileServices'

export async function createDesktopServices(): Promise<RuntimeServices> {
  try {
    const database = await Database.load('sqlite:wechat-md.db')
    return {
      kind: 'desktop',
      articleRepository: createSqliteArticleRepository(database),
      assetRepository: createSqliteAssetRepository(database),
      versionRepository: createSqliteVersionRepository(database),
      extractWechatArticle: createDesktopWechatExtractor(),
      imageFetcher: createDesktopImageFetcher(),
      files: createDesktopFileService({
        open: async (options) => await open({ ...options, multiple: false }) as string | null,
        save,
        readTextFile,
        readFile,
        writeTextFile,
        writeFile,
      }),
      databasePath: database.path,
    }
  } catch (reason) {
    const error = new Error('桌面数据无法打开', { cause: reason })
    Object.assign(error, { databasePath: 'sqlite:wechat-md.db' })
    throw error
  }
}
