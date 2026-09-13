import type { ArticleRepository } from '../features/articles/articleRepository'
import type { AssetRepository } from '../features/assets/assetRepository'
import type { ExtractedWechatArticle } from '../features/wechat/wechatExtraction'
import type { VersionRepository } from '../features/versions/versionRepository'
import type { RuntimeKind } from './runtime'

export interface RuntimeServices {
  kind: RuntimeKind
  articleRepository: ArticleRepository | null
  assetRepository: AssetRepository | null
  versionRepository: VersionRepository | null
  extractWechatArticle: (url: string) => Promise<ExtractedWechatArticle>
  imageFetcher?: typeof fetch
  databasePath?: string
}
