import { builtInContentComponents, createCustomContentComponent } from './contentComponents'

describe('content components', () => {
  it('ships reusable Markdown blocks for common public-account writing', () => {
    expect(builtInContentComponents.map((component) => component.id)).toEqual([
      'info', 'highlight', 'steps', 'section', 'image', 'code', 'signature', 'follow',
    ])
    expect(builtInContentComponents.find((component) => component.id === 'highlight')?.content).toContain('>')
  })

  it('creates an editable custom component from selected Markdown', () => {
    expect(createCustomContentComponent('component-1', '固定结尾', '**感谢阅读**')).toMatchObject({
      id: 'component-1', name: '固定结尾', content: '**感谢阅读**', builtIn: false,
    })
  })
})
