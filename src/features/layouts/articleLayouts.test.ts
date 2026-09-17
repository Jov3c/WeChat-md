import { builtInLayouts, isArticleLayoutId } from './articleLayouts'

describe('article layouts', () => {
  it('provides the six stable built-in layouts', () => {
    expect(builtInLayouts.map(({ id }) => id)).toEqual([
      'standard',
      'tutorial',
      'news',
      'information',
      'share',
      'product',
    ])
    expect(isArticleLayoutId('tutorial')).toBe(true)
    expect(isArticleLayoutId('custom-template')).toBe(false)
  })
})
