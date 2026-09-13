import type { ArticleLibrarySnapshot, ArticleRepository } from '../articles/articleRepository'
import type { AssetRepository, ImageAsset, ImageAssetSource, StoredImageAsset } from '../assets/assetRepository'
import type { StylePreset } from '../styles/stylePresets'
import type { ArticleVersion, ArticleVersionReason } from '../versions/articleVersions'
import type { VersionRepository } from '../versions/versionRepository'

const MAX_VERSIONS_PER_ARTICLE = 50

export interface SqlDatabase {
  execute(query: string, bindValues?: unknown[]): Promise<{ rowsAffected: number; lastInsertId?: number }>
  select<T>(query: string, bindValues?: unknown[]): Promise<T>
}

interface AssetRow {
  id: string
  name: string
  mime_type: string
  size: number
  created_at: string
  source: ImageAssetSource
  source_url: string | null
  unused: number
  blob: Uint8Array | number[]
}

interface VersionRow {
  id: string
  article_id: string
  title: string
  content: string
  style_id: string | null
  style_snapshot: string | null
  created_at: string
  reason: ArticleVersionReason
}

function assetMetadata(row: AssetRow): ImageAsset {
  return {
    id: row.id, name: row.name, mimeType: row.mime_type, size: row.size,
    createdAt: row.created_at, source: row.source,
    sourceUrl: row.source_url ?? undefined, unused: Boolean(row.unused),
  }
}

function storedAsset(row: AssetRow): StoredImageAsset {
  const bytes = row.blob instanceof Uint8Array ? row.blob : new Uint8Array(row.blob)
  return { ...assetMetadata(row), blob: new Blob([bytes.slice().buffer], { type: row.mime_type }) }
}

function articleVersion(row: VersionRow): ArticleVersion {
  return {
    id: row.id, articleId: row.article_id, title: row.title, content: row.content,
    styleId: row.style_id ?? undefined,
    styleSnapshot: row.style_snapshot ? JSON.parse(row.style_snapshot) as StylePreset : undefined,
    createdAt: row.created_at, reason: row.reason,
  }
}

export function createSqliteArticleRepository(database: SqlDatabase): ArticleRepository {
  return {
    async load() {
      const rows = await database.select<Array<{ payload: string }>>('SELECT payload FROM workspace_state WHERE id = 1')
      return rows[0] ? JSON.parse(rows[0].payload) as ArticleLibrarySnapshot : null
    },
    async save(snapshot) {
      await database.execute(
        'INSERT INTO workspace_state (id, payload, updated_at) VALUES (1, $1, $2) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at',
        [JSON.stringify(snapshot), new Date().toISOString()],
      )
    },
  }
}

export function createSqliteAssetRepository(database: SqlDatabase): AssetRepository {
  return {
    async save(asset) {
      const bytes = new Uint8Array(await asset.blob.arrayBuffer())
      await database.execute(
        'INSERT INTO assets (id, name, mime_type, size, created_at, source, source_url, unused, blob) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET name=excluded.name,mime_type=excluded.mime_type,size=excluded.size,created_at=excluded.created_at,source=excluded.source,source_url=excluded.source_url,unused=excluded.unused,blob=excluded.blob',
        [asset.id, asset.name, asset.mimeType, asset.size, asset.createdAt, asset.source, asset.sourceUrl ?? null, asset.unused ? 1 : 0, bytes],
      )
    },
    async get(id) {
      const rows = await database.select<AssetRow[]>('SELECT * FROM assets WHERE id = $1', [id])
      return rows[0] ? storedAsset(rows[0]) : null
    },
    async list() {
      const rows = await database.select<AssetRow[]>('SELECT id,name,mime_type,size,created_at,source,source_url,unused,blob FROM assets ORDER BY created_at DESC')
      return rows.map(assetMetadata)
    },
    async setUnused(id, unused) {
      await database.execute('UPDATE assets SET unused = $1 WHERE id = $2', [unused ? 1 : 0, id])
    },
    async delete(id) {
      await database.execute('DELETE FROM assets WHERE id = $1', [id])
    },
  }
}

export function createSqliteVersionRepository(database: SqlDatabase): VersionRepository {
  const repository: VersionRepository = {
    async save(version) {
      await database.execute(
        'INSERT INTO versions (id,article_id,title,content,style_id,style_snapshot,created_at,reason) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET article_id=excluded.article_id,title=excluded.title,content=excluded.content,style_id=excluded.style_id,style_snapshot=excluded.style_snapshot,created_at=excluded.created_at,reason=excluded.reason',
        [version.id, version.articleId, version.title, version.content, version.styleId ?? null, version.styleSnapshot ? JSON.stringify(version.styleSnapshot) : null, version.createdAt, version.reason],
      )
      const versions = await repository.list(version.articleId)
      for (const expired of versions.slice(MAX_VERSIONS_PER_ARTICLE)) await database.execute('DELETE FROM versions WHERE id = $1', [expired.id])
    },
    async list(articleId) {
      const rows = await database.select<VersionRow[]>('SELECT * FROM versions WHERE article_id = $1 ORDER BY created_at DESC', [articleId])
      return rows.map(articleVersion)
    },
    async listAll() {
      const rows = await database.select<VersionRow[]>('SELECT * FROM versions ORDER BY created_at DESC')
      return rows.map(articleVersion)
    },
    async get(id) {
      const rows = await database.select<VersionRow[]>('SELECT * FROM versions WHERE id = $1', [id])
      return rows[0] ? articleVersion(rows[0]) : null
    },
    async deleteForArticle(articleId) {
      await database.execute('DELETE FROM versions WHERE article_id = $1', [articleId])
    },
  }
  return repository
}
