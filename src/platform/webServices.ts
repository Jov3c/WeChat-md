import { createBrowserArticleRepository } from '../features/articles/articleRepository'
import { createBrowserAssetRepository } from '../features/assets/assetRepository'
import { extractWechatArticle } from '../features/wechat/wechatExtraction'
import { createBrowserVersionRepository } from '../features/versions/versionRepository'
import type { RuntimeServices } from './contracts'
import { createBrowserFileService } from './fileServices'
import { createBrowserRecoveryRepository } from '../features/recovery/recoveryRepository'

export function createWebServices(): RuntimeServices {
  return {
    kind: 'web',
    articleRepository: createBrowserArticleRepository(),
    assetRepository: createBrowserAssetRepository(),
    versionRepository: createBrowserVersionRepository(),
    recoveryRepository: createBrowserRecoveryRepository(),
    extractWechatArticle,
    imageFetcher: async (target) => fetch(`/api/assets/fetch?url=${encodeURIComponent(String(target))}`),
    files: createBrowserFileService(),
  }
}
