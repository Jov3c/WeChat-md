import { builtInArticleStyleProfiles, createArticleStyleProfiles, findActiveArticleStyleProfile } from './articleStyleProfiles'
import { builtInStylePresets, duplicateStylePreset } from './stylePresets'

describe('unified article style profiles', () => {
  it('combines every legacy layout with a visual style without losing the three original styles', () => {
    expect(new Set(builtInArticleStyleProfiles.map(({ layoutId }) => layoutId))).toEqual(
      new Set(['standard', 'tutorial', 'news', 'information', 'share', 'product']),
    )
    expect(builtInArticleStyleProfiles.map(({ name }) => name)).toEqual(expect.arrayContaining([
      '默认 · 简洁', '暖色 · 阅读', '墨色 · 长文',
    ]))
  })

  it('turns a custom visual preset into one selectable style with its saved layout', () => {
    const custom = {
      ...duplicateStylePreset(builtInStylePresets[0], 'custom-1', '我的风格'),
      layoutId: 'tutorial' as const,
    }

    const profiles = createArticleStyleProfiles([...builtInStylePresets, custom])

    expect(profiles.find(({ id }) => id === custom.id)).toMatchObject({
      name: '我的风格', styleId: 'custom-1', layoutId: 'tutorial', builtIn: false,
    })
  })

  it('identifies the active combined style from both style and layout ids', () => {
    expect(findActiveArticleStyleProfile(builtInArticleStyleProfiles, 'default', 'tutorial')?.id).toBe('tutorial')
    expect(findActiveArticleStyleProfile(builtInArticleStyleProfiles, 'default', 'standard')?.id).toBe('default')
  })
})
