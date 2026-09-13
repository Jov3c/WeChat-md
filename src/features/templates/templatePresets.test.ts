import { builtInTemplates, createCustomTemplate } from './templatePresets'

describe('article templates', () => {
  it('ships the four required built-in article structures', () => {
    expect(builtInTemplates.map((template) => template.id)).toEqual(['blank', 'tutorial', 'product', 'news'])
    expect(builtInTemplates.every((template) => template.builtIn)).toBe(true)
    expect(builtInTemplates.find((template) => template.id === 'product')?.content).toContain('## 产品亮点')
  })

  it('saves current Markdown as an editable custom template', () => {
    expect(createCustomTemplate('custom-1', '我的模板', '# 标题\n\n正文')).toEqual({
      id: 'custom-1',
      name: '我的模板',
      description: '自定义文章结构',
      content: '# 标题\n\n正文',
      builtIn: false,
    })
  })
})
