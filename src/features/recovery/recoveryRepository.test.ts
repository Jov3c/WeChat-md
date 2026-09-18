import type { StoredArticle } from '../articles/articleRepository'
import { IDBFactory } from 'fake-indexeddb'
import { createIndexedDbRecoveryRepository, createMemoryRecoveryRepository, isRecoverableSnapshot, type RecoverySnapshot } from './recoveryRepository'

const snapshot: RecoverySnapshot = {
  articleId: 'article-1',
  title: '未保存标题',
  content: '# 未保存正文',
  styleId: 'warm',
  layoutId: 'tutorial',
  updatedAt: '2026-09-18T08:00:05.000Z',
  savedAt: '2026-09-18T08:00:00.000Z',
}

const storedArticle: StoredArticle = {
  id: 'article-1',
  title: '正式标题',
  date: '今天',
  content: '# 正式正文',
  styleId: 'default',
  layoutId: 'standard',
}

describe('recovery repository', () => {
  it('stores one cloned snapshot, marks it saved and deletes it', async () => {
    const repository = createMemoryRecoveryRepository()
    await repository.save(snapshot)

    const loaded = await repository.load()
    expect(loaded).toEqual(snapshot)
    expect(loaded).not.toBe(snapshot)

    await repository.markSaved('2026-09-18T08:00:10.000Z')
    await expect(repository.load()).resolves.toMatchObject({ savedAt: '2026-09-18T08:00:10.000Z' })

    await repository.delete()
    await expect(repository.load()).resolves.toBeNull()
  })

  it('offers only a newer snapshot that differs from the formal article', () => {
    expect(isRecoverableSnapshot(snapshot, [storedArticle])).toBe(true)
    expect(isRecoverableSnapshot({ ...snapshot, updatedAt: snapshot.savedAt! }, [storedArticle])).toBe(false)
    expect(isRecoverableSnapshot({ ...snapshot, title: storedArticle.title, content: storedArticle.content, styleId: storedArticle.styleId, layoutId: storedArticle.layoutId }, [storedArticle])).toBe(false)
  })

  it('rejects snapshots for permanently deleted articles or invalid timestamps', () => {
    expect(isRecoverableSnapshot(snapshot, [])).toBe(false)
    expect(isRecoverableSnapshot({ ...snapshot, updatedAt: 'invalid' }, [storedArticle])).toBe(false)
  })

  it('persists one recovery snapshot in IndexedDB', async () => {
    const indexedDB = new IDBFactory()
    const databaseName = `recovery-${crypto.randomUUID()}`
    const writer = createIndexedDbRecoveryRepository({ indexedDB, databaseName })
    const reader = createIndexedDbRecoveryRepository({ indexedDB, databaseName })

    await writer.save(snapshot)
    await expect(reader.load()).resolves.toEqual(snapshot)

    await reader.markSaved('2026-09-18T08:00:10.000Z')
    await expect(writer.load()).resolves.toMatchObject({ savedAt: '2026-09-18T08:00:10.000Z' })

    await writer.delete()
    await expect(reader.load()).resolves.toBeNull()
  })
})
