import type { ArticleLibrarySnapshot } from '../articles/articleRepository'
import { migrateLegacyTemplateData } from './templateMigration'

describe('legacy template migration', () => {
  it('maps legacy layout template ids without changing article content', () => {
    const snapshot = {
      articles: [{ id: 'a1', title: '教程', date: '今天', content: '# 原文', templateId: 'tutorial' }],
      selectedId: 'a1',
    } satisfies ArticleLibrarySnapshot

    const migrated = migrateLegacyTemplateData(snapshot)

    expect(migrated.articles[0]).toMatchObject({
      content: '# 原文',
      templateId: 'tutorial',
      layoutId: 'tutorial',
    })
    expect(snapshot.articles[0]).not.toHaveProperty('layoutId')
  })

  it('migrates legacy custom templates and associates the selected one', () => {
    const snapshot = {
      articles: [{ id: 'a1', title: '文章', date: '今天', content: '正文', templateId: 'custom-1' }],
      selectedId: 'a1',
      templates: [{
        id: 'custom-1',
        name: '我的模板',
        description: '旧模板',
        content: '# 模板正文',
        layout: 'news',
        builtIn: false,
      }],
    } as unknown as ArticleLibrarySnapshot

    const migrated = migrateLegacyTemplateData(snapshot)

    expect(migrated.templates).toEqual([{
      id: 'custom-1',
      name: '我的模板',
      description: '旧模板',
      content: '# 模板正文',
      layoutId: 'news',
      builtIn: false,
    }])
    expect(migrated.articles[0]).toMatchObject({ layoutId: 'news', contentTemplateId: 'custom-1' })
  })

  it('uses safe defaults for blank and unknown legacy values', () => {
    const migrated = migrateLegacyTemplateData({
      articles: [
        { id: 'blank', title: '空白', date: '今天', content: '', templateId: 'blank' },
        { id: 'unknown', title: '未知', date: '今天', content: '', templateId: 'future-layout' },
      ],
      selectedId: 'blank',
    })

    expect(migrated.articles.map(({ layoutId }) => layoutId)).toEqual(['standard', 'standard'])
  })
})
