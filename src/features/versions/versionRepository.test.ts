import { IDBFactory } from 'fake-indexeddb'
import { createIndexedDbArticleRepository } from '../articles/articleRepository'
import { createIndexedDbAssetRepository } from '../assets/assetRepository'
import { createIndexedDbVersionRepository, createMemoryVersionRepository } from './versionRepository'
import type { ArticleVersion } from './articleVersions'

function version(id: string, createdAt: string): ArticleVersion {
  return { id, articleId: 'article-1', title: `文章 ${id}`, content: `内容 ${id}`, createdAt, reason: 'manual' }
}

describe('article version repository', () => {
  it('lists newest versions first and keeps only the newest fifty per article', async () => {
    const repository = createMemoryVersionRepository()
    for (let index = 0; index < 52; index += 1) {
      await repository.save(version(`v-${index}`, new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString()))
    }

    const versions = await repository.list('article-1')
    expect(versions).toHaveLength(50)
    expect(versions[0].id).toBe('v-51')
    expect(versions.at(-1)?.id).toBe('v-2')
    await expect(repository.listAll()).resolves.toHaveLength(50)
  })

  it('shares an upgraded database with articles and images without losing either', async () => {
    const indexedDB = new IDBFactory()
    const databaseName = 'wechat-md-version-storage-test'
    const articles = createIndexedDbArticleRepository({ indexedDB, databaseName })
    const assets = createIndexedDbAssetRepository({ indexedDB, databaseName })
    const versions = createIndexedDbVersionRepository({ indexedDB, databaseName })
    const snapshot = { articles: [{ id: 'article-1', title: '文章', date: '刚刚', content: '正文' }], selectedId: 'article-1' }

    await articles.save(snapshot)
    await assets.save({ id: 'image-1', name: '图.png', mimeType: 'image/png', size: 1, createdAt: '2026-01-01T00:00:00.000Z', source: 'file', blob: new Blob(['x'], { type: 'image/png' }) })
    await versions.save(version('v-1', '2026-01-01T00:00:00.000Z'))

    await expect(articles.load()).resolves.toEqual(snapshot)
    await expect(assets.get('image-1')).resolves.toMatchObject({ id: 'image-1' })
    await expect(versions.list('article-1')).resolves.toEqual([version('v-1', '2026-01-01T00:00:00.000Z')])
  })

  it('removes all versions belonging to a permanently deleted article', async () => {
    const repository = createMemoryVersionRepository([version('v-1', '2026-01-01T00:00:00.000Z')])

    await repository.deleteForArticle('article-1')

    await expect(repository.list('article-1')).resolves.toEqual([])
  })
})
