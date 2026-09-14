import { articles, replaceLegacyDemoArticles } from './demoData'

describe('fresh workspace demo content', () => {
  it('starts with one full-featured WeChat MD tutorial article', () => {
    expect(articles).toHaveLength(1)
    expect(articles[0]).toMatchObject({
      id: 'wechat-md-guide',
      title: '一篇示例，完整看懂 WeChat MD',
      templateId: 'tutorial',
    })
    expect(articles[0].content).toContain('## 先从一篇文章开始')
    expect(articles[0].content).toContain('## 让模板与风格各司其职')
    expect(articles[0].content).toContain('## 提取公众号文章与管理图片')
    expect(articles[0].content).toContain('## 发布前检查')
    expect(articles[0].content).toContain('| 功能 | 解决的问题 |')
    expect(articles[0].content).toContain('```markdown')
    expect(articles[0].content.length).toBeGreaterThan(1_200)
  })

  it('replaces legacy bundled examples while preserving user articles', () => {
    const migrated = replaceLegacyDemoArticles([
      { id: 'ollama', title: '在本地运行大语言模型：Ollama 完全指南', date: '今天', content: '# 旧示例' },
      { id: 'ai-tools', title: 'AI 工具推荐清单', date: '今天', content: '# 旧示例' },
      { id: 'my-article', title: '我的文章', date: '今天', content: '# 不应删除' },
    ])

    expect(migrated.map(({ id }) => id)).toEqual(['wechat-md-guide', 'my-article'])
    expect(migrated.find(({ id }) => id === 'my-article')?.content).toBe('# 不应删除')
  })

  it('does not add the guide to a workspace containing only user articles', () => {
    const userArticles = [{ id: 'my-article', title: '我的文章', date: '今天', content: '# 正文' }]

    expect(replaceLegacyDemoArticles(userArticles)).toEqual(userArticles)
  })
})
