import { builtInStylePresets } from './stylePresets'
import { stylePresetToAttributes, stylePresetToCssVariables } from './stylePresentation'

describe('article style presentation', () => {
  it('maps preset values to scoped preview CSS variables', () => {
    const variables = stylePresetToCssVariables(builtInStylePresets[1])

    expect(variables['--article-accent']).toBe('#9c4f3d')
    expect(variables['--article-content-width']).toBe('720px')
    expect(variables['--article-font-size']).toBe('16px')
    expect(variables['--article-line-height']).toBe('1.85')
    expect(variables['--article-h2-radius']).toBe('10px')
    expect(variables['--article-h1-border']).toBe('#141413')
    expect(variables['--article-quote-border']).toBe('#141413')
  })

  it('maps structural decoration choices to article data attributes', () => {
    const attributes = stylePresetToAttributes(builtInStylePresets[2])

    expect(attributes).toMatchObject({
      'data-h1-left-bar': 'false',
      'data-h1-underline': 'true',
      'data-h2-numbered': 'false',
      'data-image-shadow': 'false',
    })
  })
})
