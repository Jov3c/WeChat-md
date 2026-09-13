import { shouldCreateAutomaticVersion, type ArticleVersion } from './articleVersions'

describe('automatic article version policy', () => {
  const previous: ArticleVersion = {
    id: 'v1', articleId: 'article-1', title: '文章', content: '旧内容', styleId: 'default', createdAt: '2026-09-12T00:00:00.000Z', reason: 'automatic',
  }

  it('creates a version only after changed content has remained unversioned for ten minutes', () => {
    expect(shouldCreateAutomaticVersion(previous, { title: '文章', content: '新内容', styleId: 'default' }, '2026-09-12T00:10:00.000Z')).toBe(true)
    expect(shouldCreateAutomaticVersion(previous, { title: '文章', content: '新内容', styleId: 'default' }, '2026-09-12T00:09:59.000Z')).toBe(false)
  })

  it('does not create duplicate versions when title, content and style are unchanged', () => {
    expect(shouldCreateAutomaticVersion(previous, { title: '文章', content: '旧内容', styleId: 'default' }, '2026-09-12T01:00:00.000Z')).toBe(false)
  })

  it('does not create a version merely because no history exists yet', () => {
    expect(shouldCreateAutomaticVersion(undefined, { title: '文章', content: '已有内容' }, '2026-09-12T01:00:00.000Z')).toBe(false)
  })

  it('detects a changed custom-style snapshot even when the style id is unchanged', () => {
    const before = { ...previous, styleId: 'custom', styleSnapshot: { id: 'custom', name: '旧风格' } as never }
    const current = { title: '文章', content: '旧内容', styleId: 'custom', styleSnapshot: { id: 'custom', name: '新风格' } as never }
    expect(shouldCreateAutomaticVersion(before, current, '2026-09-12T01:00:00.000Z')).toBe(true)
  })
})
