import { describe, expect, it } from 'vitest'
import type { ArticleLibrarySnapshot } from '../articles/articleRepository'
import type { ArticleVersion } from '../versions/articleVersions'
import {
  createSqliteArticleRepository,
  createSqliteAssetRepository,
  createSqliteVersionRepository,
  type SqlDatabase,
} from './sqliteRepositories'

class ScriptedDatabase implements SqlDatabase {
  readonly writes: Array<{ query: string; values: unknown[] }> = []
  readonly reads: unknown[][] = []

  async execute(query: string, values: unknown[] = []) {
    this.writes.push({ query, values })
    return { rowsAffected: 1 }
  }

  async select<T>(_query: string, _values: unknown[] = []): Promise<T> {
    return (this.reads.shift() ?? []) as T
  }
}

describe('SQLite repositories', () => {
  it('round-trips the workspace snapshot through its JSON payload', async () => {
    const database = new ScriptedDatabase()
    const repository = createSqliteArticleRepository(database)
    const snapshot: ArticleLibrarySnapshot = {
      articles: [{ id: 'a-1', title: '标题', date: '今天', content: '# 正文' }],
      selectedId: 'a-1',
      syncEnabled: true,
    }

    await repository.save(snapshot)
    expect(database.writes[0].values[0]).toBe(JSON.stringify(snapshot))
    database.reads.push([{ payload: database.writes[0].values[0] }])
    await expect(repository.load()).resolves.toEqual(snapshot)
  })

  it('preserves image bytes and MIME type', async () => {
    const database = new ScriptedDatabase()
    const repository = createSqliteAssetRepository(database)
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })

    await repository.save({
      id: 'image-1', name: 'cover.png', mimeType: 'image/png', size: 3,
      createdAt: '2026-09-13T10:00:00.000Z', source: 'file', blob,
    })
    expect(database.writes[0].values[8]).toEqual(new Uint8Array([1, 2, 3]))

    database.reads.push([{
      id: 'image-1', name: 'cover.png', mime_type: 'image/png', size: 3,
      created_at: '2026-09-13T10:00:00.000Z', source: 'file', source_url: null,
      unused: 0, blob: new Uint8Array([1, 2, 3]),
    }])
    const restored = await repository.get('image-1')
    expect(restored?.mimeType).toBe('image/png')
    expect(Array.from(new Uint8Array(await restored!.blob.arrayBuffer()))).toEqual([1, 2, 3])
  })

  it('decodes style snapshots when listing versions', async () => {
    const database = new ScriptedDatabase()
    const repository = createSqliteVersionRepository(database)
    const version: ArticleVersion = {
      id: 'v-1', articleId: 'a-1', title: '标题', content: '正文', styleId: 'default',
      styleSnapshot: undefined, createdAt: '2026-09-13T10:00:00.000Z', reason: 'manual',
    }
    database.reads.push([{
      id: version.id, article_id: version.articleId, title: version.title, content: version.content,
      style_id: version.styleId, style_snapshot: null, created_at: version.createdAt, reason: version.reason,
    }])

    await expect(repository.list('a-1')).resolves.toEqual([version])
  })
})
