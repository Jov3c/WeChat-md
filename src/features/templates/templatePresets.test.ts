import { builtInTemplates, createCustomTemplate } from './templatePresets'

describe('article templates', () => {
  it('ships the required built-in article structures', () => {
    expect(builtInTemplates.map((template) => template.id)).toEqual(['blank', 'tutorial', 'news', 'information', 'share', 'product'])
    expect(builtInTemplates.every((template) => template.builtIn)).toBe(true)
    expect(builtInTemplates.map((template) => template.layout)).toEqual(['standard', 'tutorial', 'news', 'information', 'share', 'product'])
  })

  it('keeps templates focused on layout instead of bundled article copy', () => {
    expect(builtInTemplates.every((template) => template.content === '')).toBe(true)
  })

  it('saves current Markdown as an editable custom template', () => {
    expect(createCustomTemplate('custom-1', '我的模板', '# 标题\n\n正文')).toEqual({
      id: 'custom-1',
      name: '我的模板',
      description: '自定义文章排版',
      content: '# 标题\n\n正文',
      layout: 'standard',
      builtIn: false,
    })
  })
})
