import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type { ArticleLibrarySnapshot } from '../articles/articleRepository'
import { remapImageAssetIds } from '../assets/assetMarkdown'
import type { ImageAsset, StoredImageAsset } from '../assets/assetRepository'
import type { ArticleVersion } from '../versions/articleVersions'

interface BackupManifest {
  format: 'wechat-md-workspace'
  version: 1
  exportedAt: string
  snapshot: ArticleLibrarySnapshot
  versions: ArticleVersion[]
  assets: Array<ImageAsset & { path: string }>
}

export interface WorkspaceBackupData {
  snapshot: ArticleLibrarySnapshot
  versions: ArticleVersion[]
  assets: StoredImageAsset[]
}

type EntityKind = 'article' | 'style' | 'template' | 'component' | 'asset' | 'version'

export async function createWorkspaceBackup(snapshot: ArticleLibrarySnapshot, versions: ArticleVersion[], assets: StoredImageAsset[]) {
  const files: Record<string, Uint8Array> = {}
  const manifest: BackupManifest = {
    format: 'wechat-md-workspace', version: 1, exportedAt: new Date().toISOString(), snapshot, versions,
    assets: assets.map(({ blob: _blob, ...asset }) => ({ ...asset, path: `assets/${encodeURIComponent(asset.id)}` })),
  }
  files['manifest.json'] = strToU8(JSON.stringify(manifest))
  await Promise.all(assets.map(async (asset) => { files[`assets/${encodeURIComponent(asset.id)}`] = new Uint8Array(await asset.blob.arrayBuffer()) }))
  const compressed = zipSync(files, { level: 6 })
  return new Blob([compressed.slice().buffer], { type: 'application/x-wechatmd' })
}

export async function readWorkspaceBackup(blob: Blob): Promise<WorkspaceBackupData> {
  let files: Record<string, Uint8Array>
  try { files = unzipSync(new Uint8Array(await blob.arrayBuffer())) } catch { throw new Error('备份文件已损坏或格式不正确') }
  const manifestFile = files['manifest.json']
  if (!manifestFile) throw new Error('备份文件缺少清单')
  const manifest = JSON.parse(strFromU8(manifestFile)) as BackupManifest
  if (manifest.format !== 'wechat-md-workspace' || manifest.version !== 1 || !Array.isArray(manifest.snapshot?.articles)) {
    throw new Error('不支持的备份文件版本')
  }
  const assets = manifest.assets.map(({ path, ...asset }) => {
    const bytes = files[path]
    if (!bytes) throw new Error(`备份中缺少图片：${asset.name}`)
    return { ...asset, blob: new Blob([bytes.slice().buffer], { type: asset.mimeType }) }
  })
  return { snapshot: manifest.snapshot, versions: manifest.versions ?? [], assets }
}

export function mergeWorkspaceBackup(
  current: ArticleLibrarySnapshot,
  imported: WorkspaceBackupData,
  options: { existingAssetIds?: string[]; existingStyleIds?: string[]; existingTemplateIds?: string[]; existingComponentIds?: string[]; makeId?: (kind: EntityKind, oldId: string) => string } = {},
): WorkspaceBackupData {
  const makeId = options.makeId ?? ((kind, oldId) => `${oldId}-imported-${kind}-${crypto.randomUUID()}`)
  const remapCollisions = (incoming: string[], existing: string[], kind: EntityKind) => Object.fromEntries(incoming.map((id) => [id, existing.includes(id) ? makeId(kind, id) : id]))
  const articleIds = remapCollisions(imported.snapshot.articles.map(({ id }) => id), current.articles.map(({ id }) => id), 'article')
  const styleIds = remapCollisions((imported.snapshot.styles ?? []).map(({ id }) => id), [...(current.styles ?? []).map(({ id }) => id), ...(options.existingStyleIds ?? [])], 'style')
  const templateIds = remapCollisions((imported.snapshot.templates ?? []).map(({ id }) => id), [...(current.templates ?? []).map(({ id }) => id), ...(options.existingTemplateIds ?? [])], 'template')
  const componentIds = remapCollisions((imported.snapshot.components ?? []).map(({ id }) => id), [...(current.components ?? []).map(({ id }) => id), ...(options.existingComponentIds ?? [])], 'component')
  const assetIds = remapCollisions(imported.assets.map(({ id }) => id), options.existingAssetIds ?? [], 'asset')

  const importedArticles = imported.snapshot.articles.map((article) => ({
    ...article, id: articleIds[article.id], styleId: article.styleId ? (styleIds[article.styleId] ?? article.styleId) : undefined,
    content: remapImageAssetIds(article.content, assetIds),
  }))
  const importedStyles = (imported.snapshot.styles ?? []).map((style) => ({ ...style, id: styleIds[style.id] }))
  const importedTemplates = (imported.snapshot.templates ?? []).map((template) => ({ ...template, id: templateIds[template.id], content: remapImageAssetIds(template.content, assetIds) }))
  const importedComponents = (imported.snapshot.components ?? []).map((component) => ({ ...component, id: componentIds[component.id], content: remapImageAssetIds(component.content, assetIds) }))
  const versions = imported.versions.filter((version) => Object.hasOwn(articleIds, version.articleId)).map((version) => ({
    ...version, id: makeId('version', version.id), articleId: articleIds[version.articleId] ?? version.articleId,
    styleId: version.styleId ? (styleIds[version.styleId] ?? version.styleId) : undefined,
    content: remapImageAssetIds(version.content, assetIds),
  }))
  const assets = imported.assets.map((asset) => ({ ...asset, id: assetIds[asset.id] }))
  return {
    snapshot: {
      ...current, ...imported.snapshot,
      articles: [...importedArticles, ...current.articles], selectedId: articleIds[imported.snapshot.selectedId] ?? importedArticles[0]?.id ?? current.selectedId,
      styles: [...(current.styles ?? []), ...importedStyles], templates: [...(current.templates ?? []), ...importedTemplates], components: [...(current.components ?? []), ...importedComponents],
    },
    versions, assets,
  }
}
