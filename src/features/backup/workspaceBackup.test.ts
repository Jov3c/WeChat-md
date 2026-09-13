import type { ArticleLibrarySnapshot } from '../articles/articleRepository'
import type { StoredImageAsset } from '../assets/assetRepository'
import type { ArticleVersion } from '../versions/articleVersions'
import { createWorkspaceBackup, mergeWorkspaceBackup, readWorkspaceBackup } from './workspaceBackup'

const snapshot: ArticleLibrarySnapshot = {
  articles: [{ id: 'article-1', title: '文章', date: '刚刚', content: '![图](asset://image-1)', styleId: 'style-1' }],
  selectedId: 'article-1',
  styles: [{ id: 'style-1', name: '风格', description: '自定义', builtIn: false, global: {} as never, headings: {} as never, components: {} as never }],
  templates: [], components: [], syncEnabled: false, wechatArticleSavePolicy: 'always',
}
const versions: ArticleVersion[] = [{ id: 'version-1', articleId: 'article-1', title: '文章', content: '![图](asset://image-1)', styleId: 'style-1', createdAt: '2026-01-01T00:00:00.000Z', reason: 'manual' }]
const assets: StoredImageAsset[] = [{ id: 'image-1', name: '图.png', mimeType: 'image/png', size: 3, createdAt: '2026-01-01T00:00:00.000Z', source: 'file', blob: new Blob(['img'], { type: 'image/png' }) }]

describe('workspace backup', () => {
  it('round-trips the whole workspace, versions and original image bytes', async () => {
    const backup = await createWorkspaceBackup(snapshot, versions, assets)
    const restored = await readWorkspaceBackup(backup)
    expect(restored.snapshot).toEqual(snapshot)
    expect(restored.versions).toEqual(versions)
    expect(await restored.assets[0].blob.text()).toBe('img')
  })

  it('safely merges collisions and rewrites every relation', () => {
    const current: ArticleLibrarySnapshot = { articles: [{ id: 'article-1', title: '已有', date: '刚刚', content: '' }], selectedId: 'article-1', styles: [{ ...snapshot.styles![0], name: '已有风格' }] }
    const merged = mergeWorkspaceBackup(current, { snapshot, versions, assets }, {
      existingAssetIds: ['image-1'], makeId: (kind, id) => `imported-${kind}-${id}`,
    })
    const imported = merged.snapshot.articles[0]
    expect(imported.id).toBe('imported-article-article-1')
    expect(imported.styleId).toBe('imported-style-style-1')
    expect(imported.content).toContain('asset://imported-asset-image-1')
    expect(merged.versions[0]).toMatchObject({ articleId: imported.id, styleId: imported.styleId })
    expect(merged.assets[0].id).toBe('imported-asset-image-1')
    expect(merged.snapshot.articles).toHaveLength(2)
  })

  it('also remaps imported custom entities that collide with built-in ids', () => {
    const merged = mergeWorkspaceBackup({ articles: [], selectedId: '', styles: [] }, { snapshot, versions, assets }, {
      existingStyleIds: ['style-1'], makeId: (kind, id) => `safe-${kind}-${id}`,
    })
    expect(merged.snapshot.styles?.[0].id).toBe('safe-style-style-1')
    expect(merged.snapshot.articles[0].styleId).toBe('safe-style-style-1')
  })

  it('drops orphan versions instead of attaching them to an existing article with the same id', () => {
    const orphan = { ...versions[0], id: 'orphan', articleId: 'missing' }
    const merged = mergeWorkspaceBackup({ articles: [{ id: 'missing', title: '当前文章', date: '刚刚', content: '' }], selectedId: 'missing' }, { snapshot, versions: [orphan], assets })
    expect(merged.versions).toEqual([])
  })
})
