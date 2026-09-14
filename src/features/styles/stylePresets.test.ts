import { builtInStylePresets, duplicateStylePreset, updateStylePreset } from './stylePresets'

describe('article style presets', () => {
  it('ships the complete core, basic, and advanced preset catalog', () => {
    expect(builtInStylePresets).toHaveLength(36)
    expect(builtInStylePresets.slice(0, 3).map(({ id }) => id)).toEqual(['default', 'warm', 'ink'])
    expect(builtInStylePresets.filter(({ category }) => category === 'basic').map(({ name }) => name)).toEqual([
      '深海蓝', '曙光橙', '星穹紫', '鎏金黑', '青瓷', '绯樱',
      '摸鱼绿', '红白风', '石墨极简', '留白禅意', '摸鱼票据', '橄榄手记',
      '摩卡', '勃艮第', '午夜靛蓝', '芒果琥珀', '湖水青', '燕麦拿铁',
    ])
    expect(builtInStylePresets.filter(({ category }) => category === 'advanced')).toHaveLength(15)
    expect(new Set(builtInStylePresets.map(({ id }) => id)).size).toBe(36)
    expect(builtInStylePresets.every((preset) => preset.builtIn)).toBe(true)
    expect(new Set(builtInStylePresets.map((preset) => preset.global)).size).toBe(36)
    expect(new Set(builtInStylePresets.map((preset) => preset.headings.h2)).size).toBe(36)
  })

  it('maps representative basic profiles into readable article styles', () => {
    expect(builtInStylePresets.find(({ id }) => id === 'basic-ocean')).toMatchObject({
      name: '深海蓝', category: 'basic',
      global: { accentColor: '#1D4ED8', textColor: '#374151' },
      components: { quote: { borderColor: '#1D4ED8' } },
    })
    expect(builtInStylePresets.find(({ id }) => id === 'basic-onyx')).toMatchObject({
      name: '鎏金黑', category: 'basic',
      global: { accentColor: '#D97706', textColor: '#374151' },
    })
    expect(builtInStylePresets.find(({ id }) => id === 'basic-oat')).toMatchObject({
      name: '燕麦拿铁', category: 'basic',
      global: { backgroundColor: '#FAFAF9', textColor: '#44403C' },
    })
  })

  it('preserves the readable dark-paper identity of the deep-sea preset', () => {
    const preset = builtInStylePresets.find(({ id }) => id === 'visual-deep-sea-terminal')

    expect(preset).toMatchObject({
      name: '深海终端',
      global: { backgroundColor: '#101A22', textColor: '#D8E1E1', accentColor: '#5FAE9E' },
      components: { quote: { backgroundColor: '#17242D', color: '#91A3A8' } },
    })
  })

  it('duplicates a built-in preset as an editable custom style', () => {
    const duplicate = duplicateStylePreset(builtInStylePresets[0], 'custom-1', '我的简洁风格')

    expect(duplicate).toMatchObject({ id: 'custom-1', name: '我的简洁风格', builtIn: false })
    expect(duplicate.category).toBeUndefined()
    expect(duplicate.global).toEqual(builtInStylePresets[0].global)
    expect(duplicate.global).not.toBe(builtInStylePresets[0].global)
  })

  it('updates one nested style value without mutating the source preset', () => {
    const source = builtInStylePresets[0]
    const updated = updateStylePreset(source, 'headings.h2.fontSize', 28)

    expect(updated.headings.h2.fontSize).toBe(28)
    expect(source.headings.h2.fontSize).toBe(24)
    expect(updated.headings.h1).toBe(source.headings.h1)
  })
})
