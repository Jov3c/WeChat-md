import { builtInTemplates, createCustomTemplate } from './templatePresets'

describe('article templates', () => {
  it('ships the required built-in article structures', () => {
    expect(builtInTemplates.map((template) => template.id)).toEqual(['blank', 'tutorial', 'product', 'news', 'information-to-action'])
    expect(builtInTemplates.every((template) => template.builtIn)).toBe(true)
    expect(builtInTemplates.find((template) => template.id === 'product')?.content).toContain('## 产品亮点')
  })

  it('ships a long-form information-to-action template as plain Markdown', () => {
    const template = builtInTemplates.find(({ id }) => id === 'information-to-action')

    expect(template).toMatchObject({ name: '信息到行动', builtIn: true })
    expect(template?.content).toContain('# 把一条信息变成行动')
    expect(template?.content).toContain('> ')
    expect(template?.content).toContain('## 目录')
    expect(template?.content).toContain('| 阶段 |')
    expect(template?.content).toContain('```')
    expect(template?.content).not.toMatch(/<\/?(?:section|svg|style)\b/i)
    expect(template?.content).not.toContain('蓝梦')
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
