import Database from '@tauri-apps/plugin-sql'
import { open, save } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { readFile, readTextFile, writeFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { createSqliteArticleRepository, createSqliteAssetRepository, createSqliteRecoveryRepository, createSqliteVersionRepository } from '../features/storage/sqliteRepositories'
import type { RuntimeServices } from './contracts'
import { createDesktopImageFetcher, createDesktopWechatExtractor } from './desktopNetwork'
import { createDesktopFileService } from './fileServices'
import { createDesktopImageArchive } from './desktopImageArchive'

export async function createDesktopServices(): Promise<RuntimeServices> {
  try {
    const database = await Database.load('sqlite:wechat-md.db')
    return {
      kind: 'desktop',
      articleRepository: createSqliteArticleRepository(database),
      assetRepository: createSqliteAssetRepository(database),
      versionRepository: createSqliteVersionRepository(database),
      recoveryRepository: createSqliteRecoveryRepository(database),
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
      imageArchive: createDesktopImageArchive({
        invoke,
        storage: localStorage,
        selectDirectory: async (defaultPath) => await open({ directory: true, multiple: false, defaultPath }) as string | null,
      }),
      databasePath: database.path,
    }
  } catch (reason) {
    const error = new Error('桌面数据无法打开', { cause: reason })
    const details = reason instanceof Error
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : JSON.stringify(reason)
    Object.assign(error, { databasePath: 'sqlite:wechat-md.db', details })
    throw error
  }
}
