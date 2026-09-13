import { builtInStylePresets, duplicateStylePreset, updateStylePreset } from './stylePresets'

describe('article style presets', () => {
  it('ships distinct built-in presets without sharing mutable sections', () => {
    expect(builtInStylePresets.map((preset) => preset.id)).toEqual(['default', 'warm', 'ink'])
    expect(builtInStylePresets.every((preset) => preset.builtIn)).toBe(true)
    expect(builtInStylePresets[0].global).not.toBe(builtInStylePresets[1].global)
    expect(builtInStylePresets[0].headings.h2).not.toBe(builtInStylePresets[1].headings.h2)
  })

  it('duplicates a built-in preset as an editable custom style', () => {
    const duplicate = duplicateStylePreset(builtInStylePresets[0], 'custom-1', '我的简洁风格')

    expect(duplicate).toMatchObject({ id: 'custom-1', name: '我的简洁风格', builtIn: false })
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
