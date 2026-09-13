import { IDBFactory } from 'fake-indexeddb'
import { createIndexedDbArticleRepository, createMemoryArticleRepository, type ArticleLibrarySnapshot } from './articleRepository'
import { duplicateStylePreset, builtInStylePresets } from '../styles/stylePresets'

describe('IndexedDB article repository', () => {
  it('returns no library before the first save', async () => {
    const repository = createIndexedDbArticleRepository({
      indexedDB: new IDBFactory(),
      databaseName: 'wechat-md-empty-library-test',
    })

    await expect(repository.load()).resolves.toBeNull()
  })

  it('restores the saved article library and selected article', async () => {
    const indexedDB = new IDBFactory()
    const databaseName = 'wechat-md-library-test'
    const snapshot: ArticleLibrarySnapshot = {
      articles: [
        { id: 'saved-article', title: '已保存文章', date: '刚刚', content: '# 本地内容' },
      ],
      selectedId: 'saved-article',
    }
    const writer = createIndexedDbArticleRepository({ indexedDB, databaseName })
    const reader = createIndexedDbArticleRepository({ indexedDB, databaseName })

    await writer.save(snapshot)

    await expect(reader.load()).resolves.toEqual(snapshot)
  })

  it('restores article style assignments and custom style definitions', async () => {
    const repository = createIndexedDbArticleRepository({
      indexedDB: new IDBFactory(),
      databaseName: 'wechat-md-style-library-test',
    })
    const customStyle = duplicateStylePreset(builtInStylePresets[0], 'custom-paper', '纸张风格')
    const snapshot: ArticleLibrarySnapshot = {
      articles: [{ id: 'styled', title: '有样式的文章', date: '刚刚', content: '# 内容', styleId: 'custom-paper' }],
      selectedId: 'styled',
      styles: [customStyle],
    }

    await repository.save(snapshot)

    await expect(repository.load()).resolves.toEqual(snapshot)
  })

  it('keeps custom styles in the in-memory repository used by application sessions', async () => {
    const customStyle = duplicateStylePreset(builtInStylePresets[0], 'custom-paper', '纸张风格')
    const snapshot: ArticleLibrarySnapshot = {
      articles: [{ id: 'styled', title: '有样式的文章', date: '刚刚', content: '# 内容', styleId: 'custom-paper' }],
      selectedId: 'styled',
      styles: [customStyle],
    }
    const repository = createMemoryArticleRepository()

    await repository.save(snapshot)

    await expect(repository.load()).resolves.toEqual(snapshot)
  })

  it('restores custom templates and content components with the article library', async () => {
    const repository = createMemoryArticleRepository()
    const snapshot: ArticleLibrarySnapshot = {
      articles: [{ id: 'article', title: '文章', date: '刚刚', content: '# 内容' }],
      selectedId: 'article',
      templates: [{ id: 'template-1', name: '我的模板', description: '自定义文章结构', content: '# 模板', builtIn: false }],
      components: [{ id: 'component-1', name: '固定结尾', description: '自定义内容块', content: '**结尾**', builtIn: false }],
    }

    await repository.save(snapshot)

    await expect(repository.load()).resolves.toEqual(snapshot)
  })

  it('keeps the intelligent synchronization preference with the workspace', async () => {
    const repository = createMemoryArticleRepository()
    const snapshot: ArticleLibrarySnapshot = {
      articles: [{ id: 'article', title: '文章', date: '刚刚', content: '# 内容' }],
      selectedId: 'article',
      syncEnabled: false,
    }

    await repository.save(snapshot)

    await expect(repository.load()).resolves.toEqual(snapshot)
  })
})
