import { IDBFactory } from 'fake-indexeddb'
import { createIndexedDbArticleRepository } from '../articles/articleRepository'
import { createIndexedDbAssetRepository, createMemoryAssetRepository, type StoredImageAsset } from './assetRepository'

function sampleAsset(id = 'asset-1'): StoredImageAsset {
  return {
    id,
    name: '封面.png',
    mimeType: 'image/png',
    size: 4,
    createdAt: '2026-09-12T00:00:00.000Z',
    source: 'file',
    blob: new Blob(['test'], { type: 'image/png' }),
  }
}

describe('image asset repository', () => {
  it('stores image blobs and returns metadata separately from content', async () => {
    const repository = createMemoryAssetRepository()
    await repository.save(sampleAsset())

    await expect(repository.get('asset-1')).resolves.toMatchObject({ id: 'asset-1', name: '封面.png', size: 4 })
    await expect(repository.list()).resolves.toEqual([expect.objectContaining({ id: 'asset-1', name: '封面.png' })])
    expect((await repository.list())[0]).not.toHaveProperty('blob')
  })

  it('keeps the article library readable after the database gains an asset store', async () => {
    const indexedDB = new IDBFactory()
    const databaseName = 'wechat-md-shared-storage-test'
    const articles = createIndexedDbArticleRepository({ indexedDB, databaseName })
    const assets = createIndexedDbAssetRepository({ indexedDB, databaseName })
    const snapshot = { articles: [{ id: 'a1', title: '文章', date: '刚刚', content: '正文' }], selectedId: 'a1' }

    await articles.save(snapshot)
    await assets.save(sampleAsset())

    await expect(articles.load()).resolves.toEqual(snapshot)
    await expect(assets.get('asset-1')).resolves.toMatchObject({ id: 'asset-1', mimeType: 'image/png' })
  })

  it('marks an unlinked image as unused instead of deleting its blob', async () => {
    const repository = createMemoryAssetRepository()
    await repository.save(sampleAsset())

    await repository.setUnused('asset-1', true)

    await expect(repository.get('asset-1')).resolves.toMatchObject({ id: 'asset-1', unused: true, blob: expect.any(Blob) })
  })
})
