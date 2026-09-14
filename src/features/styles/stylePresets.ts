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

interface BasicPresetProfile {
  id: string
  name: string
  description: string
  primary: string
  light: string
  tint: string
  ink: string
  text: string
  muted: string
  border: string
  accent: string
  radius: number
  darkCode: boolean
  serif?: boolean
  minimal?: boolean
}

const basicProfiles: BasicPresetProfile[] = [
  { id: 'ocean', name: '深海蓝', description: '科技蓝 · 教程与实战首选', primary: '#1D4ED8', light: '#BFDBFE', tint: '#EFF6FF', ink: '#111827', text: '#374151', muted: '#9CA3AF', border: '#E8EAEE', accent: '#1D4ED8', radius: 10, darkCode: true },
  { id: 'sunrise', name: '曙光橙', description: '暖橙奶油 · 经验随笔亲和风', primary: '#EA580C', light: '#FED7AA', tint: '#FFF7ED', ink: '#1C1917', text: '#44403C', muted: '#A8A29E', border: '#EEE6DC', accent: '#EA580C', radius: 14, darkCode: false },
  { id: 'nebula', name: '星穹紫', description: '紫粉渐变 · AI 前沿与观点', primary: '#7C3AED', light: '#DDD6FE', tint: '#F5F3FF', ink: '#1E1B2E', text: '#3F3A52', muted: '#A29DB8', border: '#E8E4F4', accent: '#C026D3', radius: 12, darkCode: true },
  { id: 'onyx', name: '鎏金黑', description: '黑金衬线 · 深度分析与财经', primary: '#B45309', light: '#FDE68A', tint: '#F9FAFB', ink: '#111827', text: '#374151', muted: '#9CA3AF', border: '#E5E7EB', accent: '#D97706', radius: 6, darkCode: true, serif: true, minimal: true },
  { id: 'celadon', name: '青瓷', description: '青绿瓷感 · 知识整理与清单', primary: '#0F766E', light: '#99F6E4', tint: '#F0FDFA', ink: '#134E4A', text: '#3F4A48', muted: '#94A8A5', border: '#DDE9E6', accent: '#0D9488', radius: 8, darkCode: false },
  { id: 'sakura', name: '绯樱', description: '樱粉圆角 · 生活与情感随笔', primary: '#DB2777', light: '#FBCFE8', tint: '#FDF2F8', ink: '#1F1723', text: '#4A3B47', muted: '#B294A9', border: '#F1E2EA', accent: '#E11D48', radius: 16, darkCode: false, serif: true },
  { id: 'moyu-green', name: '摸鱼绿', description: '教程测评万能款', primary: '#059669', light: '#A7F3D0', tint: '#ECFDF5', ink: '#111827', text: '#374151', muted: '#9CA3AF', border: '#E4E9E7', accent: '#059669', radius: 10, darkCode: true },
  { id: 'red-white', name: '红白风', description: '观点文的力量感', primary: '#DC2626', light: '#FECACA', tint: '#FEF2F2', ink: '#111827', text: '#374151', muted: '#9CA3AF', border: '#E8EAEE', accent: '#DC2626', radius: 8, darkCode: true },
  { id: 'graphite', name: '石墨极简', description: '全灰阶 · 高级留白', primary: '#52525B', light: '#D4D4D8', tint: '#F4F4F5', ink: '#18181B', text: '#3F3F46', muted: '#A1A1AA', border: '#E4E4E7', accent: '#52525B', radius: 6, darkCode: true, minimal: true },
  { id: 'zen', name: '留白禅意', description: '禅意留白 · 呼吸感最强', primary: '#4A5D52', light: '#B5C8BC', tint: '#F6F8F7', ink: '#26332C', text: '#3F4A45', muted: '#9AA8A1', border: '#E2E8E4', accent: '#4A5D52', radius: 12, darkCode: false, serif: true, minimal: true },
  { id: 'ticket', name: '摸鱼票据', description: '票据隐喻 · 测评对比', primary: '#047857', light: '#A7F3D0', tint: '#ECFDF5', ink: '#111827', text: '#374151', muted: '#9CA3AF', border: '#E4E9E7', accent: '#059669', radius: 12, darkCode: true },
  { id: 'olive', name: '橄榄手记', description: '内刊质感 · 黑与橙', primary: '#1E1F23', light: '#FED7AA', tint: '#F5F4EF', ink: '#1E1F23', text: '#3F3F46', muted: '#A1A1AA', border: '#E5E2D9', accent: '#ED7B2F', radius: 6, darkCode: true, serif: true, minimal: true },
  { id: 'mocha', name: '摩卡', description: '咖啡棕 · 读书笔记与书评', primary: '#92400E', light: '#FDDFBB', tint: '#FFFBF3', ink: '#1C1917', text: '#44403C', muted: '#A8A29E', border: '#EDE4D8', accent: '#B45309', radius: 10, darkCode: false, serif: true },
  { id: 'burgundy', name: '勃艮第', description: '酒红酒金 · 品牌与高端质感', primary: '#9F1239', light: '#FECDD3', tint: '#FFF1F2', ink: '#1C1017', text: '#43333B', muted: '#A78E98', border: '#EDDFE4', accent: '#D97706', radius: 8, darkCode: true, serif: true, minimal: true },
  { id: 'midnight', name: '午夜靛蓝', description: '靛蓝深空 · 硬核技术长文', primary: '#3730A3', light: '#C7D2FE', tint: '#EEF2FF', ink: '#1E1B4B', text: '#3B3A5C', muted: '#9A98BD', border: '#E3E5F2', accent: '#6366F1', radius: 10, darkCode: true },
  { id: 'mango', name: '芒果琥珀', description: '琥珀黄 · 活力清单与盘点', primary: '#CA8A04', light: '#FDE68A', tint: '#FEFCE8', ink: '#1C1917', text: '#44403C', muted: '#A8A29E', border: '#EDE7D3', accent: '#D97706', radius: 12, darkCode: false },
  { id: 'lake', name: '湖水青', description: '湖水青 · 商业案例与复盘', primary: '#0E7490', light: '#A5F3FC', tint: '#ECFEFF', ink: '#164E63', text: '#3F525A', muted: '#93AAB2', border: '#DCEAEE', accent: '#0891B2', radius: 10, darkCode: false },
  { id: 'oat', name: '燕麦拿铁', description: '暖灰米白 · 无彩色极简生活', primary: '#57534E', light: '#D6D3D1', tint: '#FAFAF9', ink: '#1C1917', text: '#44403C', muted: '#A8A29E', border: '#E7E5E4', accent: '#78716C', radius: 14, darkCode: false, serif: true, minimal: true },
]

function createBasicPreset(profile: BasicPresetProfile): StylePreset {
  const preset = clonePreset(defaultPreset)
  const rounded = Math.min(profile.radius, 16)
  Object.assign(preset, {
    id: `basic-${profile.id}`,
    name: profile.name,
    description: profile.description,
    category: 'basic',
  })
  Object.assign(preset.global, {
    accentColor: profile.accent,
    textColor: profile.text,
    fontFamily: profile.serif ? 'serif' : 'system-ui',
    fontSize: profile.minimal ? 16 : 15,
    lineHeight: profile.minimal ? 1.9 : 1.8,
    paragraphSpacing: profile.minimal ? 25 : 21,
    backgroundColor: profile.tint,
    contentWidth: profile.minimal ? 660 : 690,
  })
  Object.assign(preset.headings.h1, {
    color: profile.primary,
    textAlign: profile.minimal ? 'center' : 'left',
    leftBar: !profile.minimal,
    underline: profile.minimal,
    borderColor: profile.light,
    borderRadius: rounded,
  })
  Object.assign(preset.headings.h2, {
    color: profile.primary,
    numbered: !profile.minimal,
    underline: profile.minimal,
    leftBar: !profile.minimal,
    backgroundColor: profile.minimal ? 'transparent' : profile.tint,
    borderColor: profile.light,
    borderRadius: rounded,
  })
  Object.assign(preset.headings.h3, {
    color: profile.ink,
    backgroundColor: profile.tint,
    borderColor: profile.light,
    borderRadius: rounded,
    leftBar: profile.minimal,
  })
  Object.assign(preset.components.paragraph, { color: profile.text })
  Object.assign(preset.components.quote, { backgroundColor: profile.tint, borderColor: profile.primary, color: profile.text, borderRadius: rounded })
  Object.assign(preset.components.list, { markerColor: profile.accent })
  Object.assign(preset.components.link, { color: profile.primary, underline: true })
  Object.assign(preset.components.strong, { color: profile.ink })
  Object.assign(preset.components.inlineCode, { backgroundColor: profile.light, color: profile.ink, borderRadius: Math.min(rounded, 6) })
  Object.assign(preset.components.codeBlock, {
    backgroundColor: profile.darkCode ? profile.ink : profile.tint,
    color: profile.darkCode ? '#FFFFFF' : profile.ink,
    borderColor: profile.border,
    borderRadius: rounded,
  })
  Object.assign(preset.components.table, { headerBackground: profile.tint, borderColor: profile.border, borderRadius: rounded })
  Object.assign(preset.components.image, { borderRadius: rounded, shadow: profile.radius >= 12, captionColor: profile.muted })
  Object.assign(preset.components.divider, { color: profile.light, thickness: profile.minimal ? 1 : 2 })
  return preset
}

type VisualSchool = 'editorial' | 'international' | 'humanist' | 'digital' | 'expressive'
type VisualDensity = 'airy' | 'balanced' | 'compact'

interface VisualPresetProfile {
  id: string
  name: string
  description: string
  school: VisualSchool
  density: VisualDensity
  paper: string
  surface: string
  ink: string
  muted: string
  accent: string
  accent2: string
  line: string
  radius: number
  border: number
  centeredTitle?: boolean
}

const visualProfiles: VisualPresetProfile[] = [
  { id: 'editorial-vermilion', name: '墨红社论', description: '深度观点与评论', school: 'editorial', density: 'airy', paper: '#FFFFFF', surface: '#FBFAF8', ink: '#201F1D', muted: '#777168', accent: '#B33A2B', accent2: '#E4C5B8', line: '#DDD8D0', radius: 0, border: 1 },
  { id: 'mono-gold-journal', name: '黑金刊读', description: '品牌观点与专业长文', school: 'editorial', density: 'airy', paper: '#FFFFFF', surface: '#FBFAF6', ink: '#171714', muted: '#6D675B', accent: '#87682F', accent2: '#D8CCAE', line: '#C7BEAD', radius: 4, border: 1, centeredTitle: true },
  { id: 'coral-zine', name: '珊瑚杂志', description: '人物、文化与生活方式', school: 'editorial', density: 'balanced', paper: '#FFFFFF', surface: '#FFF7F5', ink: '#402D33', muted: '#79676C', accent: '#B95054', accent2: '#E4B1A6', line: '#E9D8D4', radius: 18, border: 0 },
  { id: 'swiss-signal', name: '瑞士信号', description: '方法论、清单与工具文章', school: 'international', density: 'compact', paper: '#FFFFFF', surface: '#F7F7F5', ink: '#1D1D1B', muted: '#66645E', accent: '#3157A4', accent2: '#D0B85A', line: '#C8C7C2', radius: 0, border: 2 },
  { id: 'citrus-report', name: '柑橘报告', description: '数据报告与项目复盘', school: 'international', density: 'compact', paper: '#FFFFFF', surface: '#F8FAF1', ink: '#20241F', muted: '#6D736A', accent: '#65731F', accent2: '#C87945', line: '#D2D7CD', radius: 8, border: 1 },
  { id: 'blueprint-grid', name: '蓝图网格', description: '技术教程与流程说明', school: 'international', density: 'compact', paper: '#FFFFFF', surface: '#F7FAFC', ink: '#16364A', muted: '#5D7480', accent: '#2F718C', accent2: '#B86157', line: '#C8D9E0', radius: 2, border: 1 },
  { id: 'rice-paper', name: '稻纸朱砂', description: '随笔、传统文化与深度观察', school: 'humanist', density: 'airy', paper: '#FFFFFF', surface: '#FAF7F0', ink: '#34312B', muted: '#736C60', accent: '#A64232', accent2: '#C9B88F', line: '#DED5C3', radius: 2, border: 0, centeredTitle: true },
  { id: 'botanical-notes', name: '植物手记', description: '知识、自然与生活方式', school: 'humanist', density: 'balanced', paper: '#FFFFFF', surface: '#F7FAF5', ink: '#29352B', muted: '#68766A', accent: '#627A45', accent2: '#D2A66B', line: '#D2D9CC', radius: 14, border: 1 },
  { id: 'soft-clay', name: '柔和陶土', description: '教育、成长与情绪表达', school: 'humanist', density: 'balanced', paper: '#FFFFFF', surface: '#FFF7F2', ink: '#4A352C', muted: '#806B62', accent: '#9F5E45', accent2: '#D2B49D', line: '#E7D6CB', radius: 24, border: 0 },
  { id: 'deep-sea-terminal', name: '深海终端', description: 'AI、开发工具与技术资讯', school: 'digital', density: 'compact', paper: '#101A22', surface: '#17242D', ink: '#D8E1E1', muted: '#91A3A8', accent: '#5FAE9E', accent2: '#C39A5E', line: '#30434D', radius: 8, border: 1 },
  { id: 'mist-research', name: '雾蓝研究', description: '研究摘要与专业解释', school: 'digital', density: 'airy', paper: '#FFFFFF', surface: '#F5F8FA', ink: '#263843', muted: '#5F717C', accent: '#4F7489', accent2: '#B8CCD6', line: '#D2DEE3', radius: 12, border: 1 },
  { id: 'violet-studio', name: '紫灰工作室', description: '创意工具与设计观察', school: 'digital', density: 'balanced', paper: '#FFFFFF', surface: '#F8F6FA', ink: '#352E3E', muted: '#716779', accent: '#705B8C', accent2: '#B4C185', line: '#DDD7E1', radius: 16, border: 1 },
  { id: 'neo-brutal', name: '新粗野', description: '强观点、反常识与创意评论', school: 'expressive', density: 'compact', paper: '#FFFFFF', surface: '#FFF8E8', ink: '#1D1D1B', muted: '#55504A', accent: '#B94A32', accent2: '#A9C8BC', line: '#1D1D1B', radius: 0, border: 3 },
  { id: 'night-editorial', name: '暗夜编辑', description: '趋势、观察与故事化科技', school: 'expressive', density: 'airy', paper: '#FFFFFF', surface: '#242320', ink: '#26231F', muted: '#746F68', accent: '#B95833', accent2: '#C6A85F', line: '#D8D2CA', radius: 2, border: 1 },
  { id: 'archive-sepia', name: '档案棕褐', description: '案例复盘、历史与资料整理', school: 'expressive', density: 'balanced', paper: '#FFFFFF', surface: '#F8F3EA', ink: '#3A3028', muted: '#756658', accent: '#8B5B3E', accent2: '#C79C68', line: '#D4C5B0', radius: 3, border: 1 },
]

function createVisualPreset(profile: VisualPresetProfile): StylePreset {
  const preset = clonePreset(defaultPreset)
  const compact = profile.density === 'compact'
  const airy = profile.density === 'airy'
  const serif = profile.school === 'editorial' || profile.school === 'humanist'
  const emphatic = profile.school === 'international' || profile.school === 'expressive'
  const dark = profile.paper === '#101A22'
  const rounded = Math.min(profile.radius, 16)

  Object.assign(preset, {
    id: `visual-${profile.id}`,
    name: profile.name,
    description: profile.description,
    category: 'advanced',
  })
  Object.assign(preset.global, {
    accentColor: profile.accent,
    textColor: profile.ink,
    fontFamily: serif ? 'serif' : 'system-ui',
    fontSize: compact ? 15 : 16,
    lineHeight: compact ? 1.7 : airy ? 1.9 : 1.8,
    letterSpacing: profile.school === 'international' ? 0.2 : 0,
    paragraphSpacing: compact ? 18 : airy ? 26 : 22,
    backgroundColor: profile.paper,
    contentWidth: compact ? 700 : airy ? 660 : 680,
  })
  Object.assign(preset.headings.h1, {
    fontSize: compact ? 30 : airy ? 34 : 32,
    fontWeight: emphatic ? 800 : 700,
    color: profile.accent,
    marginBottom: airy ? 30 : 24,
    textAlign: profile.centeredTitle ? 'center' : 'left',
    underline: profile.school === 'editorial' && profile.radius <= 4,
    leftBar: profile.school === 'digital' && !profile.centeredTitle,
    backgroundColor: 'transparent',
    borderColor: profile.accent,
    borderRadius: rounded,
  })
  Object.assign(preset.headings.h2, {
    fontSize: compact ? 21 : 23,
    fontWeight: emphatic ? 800 : 700,
    color: profile.accent,
    marginTop: airy ? 30 : 24,
    marginBottom: compact ? 14 : 18,
    numbered: true,
    underline: profile.radius <= 3,
    leftBar: profile.school === 'digital' || profile.school === 'humanist',
    backgroundColor: profile.radius >= 8 ? profile.surface : 'transparent',
    borderColor: profile.accent,
    borderRadius: rounded,
  })
  Object.assign(preset.headings.h3, {
    color: profile.ink,
    backgroundColor: profile.surface,
    borderColor: profile.accent2,
    borderRadius: rounded,
    leftBar: profile.radius < 8,
  })
  Object.assign(preset.components.paragraph, { color: profile.ink })
  Object.assign(preset.components.quote, { backgroundColor: profile.surface, borderColor: profile.accent, color: profile.muted, borderRadius: rounded })
  Object.assign(preset.components.list, { markerColor: profile.accent, indent: compact ? 24 : 28, itemSpacing: airy ? 5 : 2 })
  Object.assign(preset.components.link, { color: profile.accent, underline: true })
  Object.assign(preset.components.strong, { color: profile.accent })
  Object.assign(preset.components.inlineCode, { backgroundColor: profile.surface, color: dark ? profile.accent : profile.ink, borderRadius: Math.min(rounded, 6) })
  Object.assign(preset.components.codeBlock, { backgroundColor: dark ? profile.surface : profile.ink, color: dark ? profile.ink : profile.paper, borderColor: profile.line, borderRadius: rounded, fontSize: compact ? 13 : 14 })
  Object.assign(preset.components.table, { headerBackground: profile.surface, borderColor: profile.line, borderRadius: rounded })
  Object.assign(preset.components.image, { borderRadius: rounded, shadow: profile.radius >= 12, captionColor: profile.muted })
  Object.assign(preset.components.divider, { color: profile.accent2, thickness: profile.border, margin: airy ? 28 : 22 })
  return preset
}

export const builtInStylePresets: StylePreset[] = [
  clonePreset(defaultPreset), warmPreset, inkPreset,
  ...basicProfiles.map(createBasicPreset),
  ...visualProfiles.map(createVisualPreset),
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
