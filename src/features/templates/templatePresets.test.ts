import {
  builtInContentTemplates,
  builtInTemplates,
  createCustomContentTemplate,
  createCustomTemplate,
} from './templatePresets'

describe('article content templates', () => {
  it('ships editable templates with real markdown skeletons', () => {
    expect(builtInContentTemplates.map((template) => template.id)).toEqual([
      'tutorial-guide',
      'news-report',
      'information-digest',
      'experience-share',
      'product-introduction',
    ])
    for (const template of builtInContentTemplates) {
      expect(template.builtIn).toBe(true)
      expect(template.content).toMatch(/^# /)
      expect(template.content).toMatch(/\n## /)
      expect(template.layoutId).toBeTruthy()
    }
  })

  it('saves current Markdown and layout as an editable custom template', () => {
    expect(createCustomContentTemplate('custom-1', '我的模板', '# 标题\n\n正文', 'news')).toEqual({
      id: 'custom-1',
      name: '我的模板',
      description: '自定义内容模板',
      content: '# 标题\n\n正文',
      layoutId: 'news',
      builtIn: false,
    })
  })

  it('keeps temporary export aliases compatible while callers migrate', () => {
    expect(builtInTemplates).toBe(builtInContentTemplates)
    expect(createCustomTemplate).toBe(createCustomContentTemplate)
  })
})
