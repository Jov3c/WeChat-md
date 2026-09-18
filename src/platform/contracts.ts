import type { ArticleRepository } from '../features/articles/articleRepository'
import type { AssetRepository } from '../features/assets/assetRepository'
import type { ExtractedWechatArticle } from '../features/wechat/wechatExtraction'
import type { VersionRepository } from '../features/versions/versionRepository'
import type { RuntimeKind } from './runtime'
import type { TextExport } from '../features/export/articleExport'
import type { DesktopImageArchive } from './desktopImageArchive'
import type { RecoveryRepository } from '../features/recovery/recoveryRepository'

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface OpenFileOptions {
  title?: string
  filters: FileFilter[]
}

export interface OpenedTextFile {
  name: string
  content: string
}

export interface OpenedBinaryFile {
  name: string
  bytes: Uint8Array
}

export interface SaveBytesOptions {
  filename: string
  mimeType: string
  bytes: Uint8Array
}

export interface FileService {
  openText(options: OpenFileOptions): Promise<OpenedTextFile | null>
  openBytes(options: OpenFileOptions): Promise<OpenedBinaryFile | null>
  saveText(file: TextExport): Promise<'saved' | 'cancelled'>
  saveBytes(options: SaveBytesOptions): Promise<'saved' | 'cancelled'>
}

export interface RuntimeServices {
  kind: RuntimeKind
  articleRepository: ArticleRepository | null
  assetRepository: AssetRepository | null
  versionRepository: VersionRepository | null
  recoveryRepository: RecoveryRepository | null
  extractWechatArticle: (url: string) => Promise<ExtractedWechatArticle>
  imageFetcher?: typeof fetch
  files: FileService
  databasePath?: string
  imageArchive?: DesktopImageArchive
}
