export interface GlobalArticleStyle {
  accentColor: string
  textColor: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  letterSpacing: number
  paragraphSpacing: number
  backgroundColor: string
  contentWidth: number
}

export interface HeadingStyle {
  fontSize: number
  fontWeight: number
  color: string
  marginTop: number
  marginBottom: number
  textAlign: 'left' | 'center' | 'right'
  numbered: boolean
  underline: boolean
  leftBar: boolean
  backgroundColor: string
  borderColor: string
  borderRadius: number
}

export interface ArticleComponentStyles {
  paragraph: { color: string; indent: number }
  quote: { backgroundColor: string; borderColor: string; color: string; borderRadius: number }
  list: { markerColor: string; indent: number; itemSpacing: number }
  link: { color: string; underline: boolean }
  strong: { color: string }
  inlineCode: { backgroundColor: string; color: string; borderRadius: number }
  codeBlock: { backgroundColor: string; color: string; borderColor: string; borderRadius: number; fontSize: number }
  table: { headerBackground: string; borderColor: string; borderRadius: number }
  image: { borderRadius: number; shadow: boolean; captionColor: string }
  divider: { color: string; thickness: number; margin: number }
}

export interface StylePreset {
  id: string
  basePresetId?: string
  layoutId?: import('../layouts/articleLayouts').ArticleLayoutId
  category?: 'core' | 'basic' | 'advanced'
  name: string
  description: string
  builtIn: boolean
  global: GlobalArticleStyle
  headings: { h1: HeadingStyle; h2: HeadingStyle; h3: HeadingStyle }
  components: ArticleComponentStyles
}

export type StyleValuePath =
  | `global.${keyof GlobalArticleStyle}`
  | `headings.${'h1' | 'h2' | 'h3'}.${keyof HeadingStyle}`
  | `components.${keyof ArticleComponentStyles}.${string}`

const defaultPreset: StylePreset = {
  id: 'default',
  category: 'core',
  name: '默认 · 简洁',
  description: '清爽、专注的公众号风格',
  builtIn: true,
  global: { accentColor: '#141413', textColor: '#2d2d2a', fontFamily: 'system-ui', fontSize: 15, lineHeight: 1.75, letterSpacing: 0, paragraphSpacing: 21, backgroundColor: '#ffffff', contentWidth: 720 },
  headings: {
    h1: { fontSize: 31, fontWeight: 700, color: '#141413', marginTop: 0, marginBottom: 24, textAlign: 'left', numbered: false, underline: false, leftBar: true, backgroundColor: 'transparent', borderColor: '#141413', borderRadius: 0 },
    h2: { fontSize: 24, fontWeight: 700, color: '#141413', marginTop: 0, marginBottom: 17, textAlign: 'left', numbered: true, underline: false, leftBar: false, backgroundColor: 'transparent', borderColor: '#141413', borderRadius: 0 },
    h3: { fontSize: 16, fontWeight: 600, color: '#141413', marginTop: 15, marginBottom: 15, textAlign: 'left', numbered: false, underline: false, leftBar: false, backgroundColor: '#f5f4ed', borderColor: '#e8e6dc', borderRadius: 6 },
  },
  components: {
    paragraph: { color: '#2d2d2a', indent: 0 },
    quote: { backgroundColor: '#f5f4ed', borderColor: '#141413', color: '#5e5d59', borderRadius: 0 },
    list: { markerColor: '#141413', indent: 26, itemSpacing: 0 },
    link: { color: '#141413', underline: true },
    strong: { color: '#141413' },
    inlineCode: { backgroundColor: '#f5f4ed', color: '#2d2d2a', borderRadius: 4 },
    codeBlock: { backgroundColor: '#f5f4ed', color: '#2d2d2a', borderColor: '#e8e6dc', borderRadius: 6, fontSize: 13 },
    table: { headerBackground: '#f5f4ed', borderColor: '#e8e6dc', borderRadius: 6 },
    image: { borderRadius: 6, shadow: false, captionColor: '#87867f' },
    divider: { color: '#e8e6dc', thickness: 1, margin: 22 },
  },
}

function clonePreset(preset: StylePreset): StylePreset {
  return {
    ...preset,
    global: { ...preset.global },
    headings: { h1: { ...preset.headings.h1 }, h2: { ...preset.headings.h2 }, h3: { ...preset.headings.h3 } },
    components: Object.fromEntries(
      Object.entries(preset.components).map(([key, value]) => [key, { ...value }]),
    ) as unknown as ArticleComponentStyles,
  }
}

const warmPreset = clonePreset(defaultPreset)
Object.assign(warmPreset, { id: 'warm', name: '暖色 · 阅读', description: '柔和纸感与温暖强调色' })
Object.assign(warmPreset.global, { accentColor: '#9c4f3d', textColor: '#3c302b', backgroundColor: '#fffaf2', fontSize: 16, lineHeight: 1.85 })
Object.assign(warmPreset.headings.h1, { color: '#7f3f32', borderColor: '#141413' })
Object.assign(warmPreset.headings.h2, { color: '#7f3f32', backgroundColor: '#f8e8df', borderRadius: 10 })
Object.assign(warmPreset.components.quote, { backgroundColor: '#f8eee7', borderColor: '#141413', color: '#684c43', borderRadius: 6 })
Object.assign(warmPreset.components.link, { color: '#9c4f3d' })

const inkPreset = clonePreset(defaultPreset)
Object.assign(inkPreset, { id: 'ink', name: '墨色 · 长文', description: '克制、适合深度阅读的黑白风格' })
Object.assign(inkPreset.global, { accentColor: '#20201e', textColor: '#252522', fontFamily: 'serif', fontSize: 16, lineHeight: 1.9, contentWidth: 680 })
Object.assign(inkPreset.headings.h1, { fontSize: 34, textAlign: 'center', leftBar: false, underline: true })
Object.assign(inkPreset.headings.h2, { numbered: false, underline: true })
Object.assign(inkPreset.headings.h3, { backgroundColor: 'transparent', leftBar: true })

export const builtInStylePresets: StylePreset[] = [
  clonePreset(defaultPreset), warmPreset, inkPreset,
]

export function duplicateStylePreset(source: StylePreset, id: string, name: string): StylePreset {
  const duplicate = clonePreset(source)
  delete duplicate.category
  return {
    ...duplicate,
    id,
    basePresetId: source.builtIn ? source.id : source.basePresetId,
    name,
    description: `基于“${source.name}”创建`,
    builtIn: false,
  }
}

function setAtPath(current: unknown, segments: string[], value: unknown): unknown {
  if (segments.length === 0) return value
  const [head, ...tail] = segments
  const record = current as Record<string, unknown>
  return { ...record, [head]: setAtPath(record[head], tail, value) }
}

export function updateStylePreset(preset: StylePreset, path: StyleValuePath, value: string | number | boolean): StylePreset {
  return setAtPath(preset, path.split('.'), value) as StylePreset
}
