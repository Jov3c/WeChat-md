import type { StylePreset } from './stylePresets'

const px = (value: number) => `${value}px`

export function stylePresetToCssVariables(preset: StylePreset): Record<string, string> {
  const { global, headings, components } = preset
  return {
    '--article-accent': global.accentColor,
    '--article-text': global.textColor,
    '--article-font-family': global.fontFamily,
    '--article-font-size': px(global.fontSize),
    '--article-line-height': String(global.lineHeight),
    '--article-letter-spacing': px(global.letterSpacing),
    '--article-paragraph-spacing': px(global.paragraphSpacing),
    '--article-background': global.backgroundColor,
    '--article-content-width': px(global.contentWidth),
    ...Object.fromEntries((['h1', 'h2', 'h3'] as const).flatMap((level) => {
      const heading = headings[level]
      const prefix = `--article-${level}`
      return [
        [`${prefix}-size`, px(heading.fontSize)], [`${prefix}-weight`, String(heading.fontWeight)],
        [`${prefix}-color`, heading.color], [`${prefix}-margin-top`, px(heading.marginTop)],
        [`${prefix}-margin-bottom`, px(heading.marginBottom)], [`${prefix}-align`, heading.textAlign],
        [`${prefix}-background`, heading.backgroundColor], [`${prefix}-border`, heading.borderColor],
        [`${prefix}-radius`, px(heading.borderRadius)],
      ]
    })),
    '--article-paragraph-color': components.paragraph.color,
    '--article-paragraph-indent': px(components.paragraph.indent),
    '--article-quote-background': components.quote.backgroundColor,
    '--article-quote-border': components.quote.borderColor,
    '--article-quote-color': components.quote.color,
    '--article-quote-radius': px(components.quote.borderRadius),
    '--article-list-marker': components.list.markerColor,
    '--article-list-indent': px(components.list.indent),
    '--article-list-spacing': px(components.list.itemSpacing),
    '--article-link-color': components.link.color,
    '--article-strong-color': components.strong.color,
    '--article-inline-code-background': components.inlineCode.backgroundColor,
    '--article-inline-code-color': components.inlineCode.color,
    '--article-inline-code-radius': px(components.inlineCode.borderRadius),
    '--article-code-background': components.codeBlock.backgroundColor,
    '--article-code-color': components.codeBlock.color,
    '--article-code-border': components.codeBlock.borderColor,
    '--article-code-radius': px(components.codeBlock.borderRadius),
    '--article-code-size': px(components.codeBlock.fontSize),
    '--article-table-header': components.table.headerBackground,
    '--article-table-border': components.table.borderColor,
    '--article-table-radius': px(components.table.borderRadius),
    '--article-image-radius': px(components.image.borderRadius),
    '--article-caption-color': components.image.captionColor,
    '--article-divider-color': components.divider.color,
    '--article-divider-thickness': px(components.divider.thickness),
    '--article-divider-margin': px(components.divider.margin),
  }
}

export function stylePresetToAttributes(preset: StylePreset): Record<string, string> {
  return {
    'data-h1-numbered': String(preset.headings.h1.numbered),
    'data-h1-underline': String(preset.headings.h1.underline),
    'data-h1-left-bar': String(preset.headings.h1.leftBar),
    'data-h2-numbered': String(preset.headings.h2.numbered),
    'data-h2-underline': String(preset.headings.h2.underline),
    'data-h2-left-bar': String(preset.headings.h2.leftBar),
    'data-h3-numbered': String(preset.headings.h3.numbered),
    'data-h3-underline': String(preset.headings.h3.underline),
    'data-h3-left-bar': String(preset.headings.h3.leftBar),
    'data-link-underline': String(preset.components.link.underline),
    'data-image-shadow': String(preset.components.image.shadow),
  }
}
