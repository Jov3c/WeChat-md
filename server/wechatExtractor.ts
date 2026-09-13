import { load, type Cheerio, type CheerioAPI } from 'cheerio'
import juice from 'juice'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import type { AnyNode } from 'domhandler'
import type { ExtractedComponent, ExtractedStyleToken, ExtractedWechatArticle } from '../src/features/wechat/wechatExtraction.ts'

export class WechatExtractorError extends Error {
  constructor(
    readonly code: 'INVALID_URL' | 'FETCH_FAILED' | 'ARTICLE_BLOCKED' | 'ARTICLE_NOT_FOUND' | 'ARTICLE_TOO_LARGE',
    message: string,
  ) {
    super(message)
  }
}

const REMOVED_TAGS = 'script,style,link,meta,iframe,frame,object,embed,form,input,button,textarea,select,noscript,canvas,svg,audio,video'
const MAX_ARTICLE_BYTES = 5 * 1024 * 1024

function normalizeColor(value: string | undefined) {
  const hex = value?.match(/#[0-9a-f]{3,8}\b/i)?.[0]
  if (hex) {
    if (hex.length === 4) return `#${hex.slice(1).split('').map((part) => part + part).join('')}`.toUpperCase()
    return hex.slice(0, 7).toUpperCase()
  }
  const rgb = value?.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
  if (!rgb) return undefined
  return `#${rgb.slice(1, 4).map((part) => Math.min(255, Math.round(Number(part))).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

function styleMap(value = '') {
  return new Map(value.split(';').flatMap((declaration) => {
    const separator = declaration.indexOf(':')
    if (separator < 1) return []
    return [[declaration.slice(0, separator).trim().toLowerCase(), declaration.slice(separator + 1).trim()]] as const
  }))
}

function pixels(value: string | undefined) {
  const match = value?.match(/^([\d.]+)px$/i)
  return match ? Number(match[1]) : undefined
}

function lineHeight(value: string | undefined, fontSize: number | undefined) {
  if (!value) return undefined
  if (/^[\d.]+$/.test(value)) return Number(value)
  const em = value.match(/^([\d.]+)em$/i)
  if (em) return Number(em[1])
  const px = pixels(value)
  return px && fontSize ? Number((px / fontSize).toFixed(2)) : undefined
}

function spacing(value: string | undefined, fontSize: number | undefined) {
  const px = pixels(value)
  if (px !== undefined) return px
  const em = value?.match(/^([\d.]+)em$/i)
  return em && fontSize ? Number((Number(em[1]) * fontSize).toFixed(2)) : undefined
}

function addWeight<K>(map: Map<K, number>, key: K | undefined, weight: number) {
  if (key !== undefined) map.set(key, (map.get(key) || 0) + weight)
}

function best<K>(map: Map<K, number>) {
  return [...map.entries()].sort((left, right) => right[1] - left[1])[0]?.[0]
}

function bestTextColor(map: Map<string, number>) {
  const neutral = [...map.entries()].filter(([color]) => !isAccentColor(color))
  return neutral.sort((left, right) => right[1] - left[1])[0]?.[0] ?? best(map)
}

function isAccentColor(color: string) {
  const channels = [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)].map((part) => Number.parseInt(part, 16))
  return Math.max(...channels) - Math.min(...channels) >= 55 && channels.reduce((sum, channel) => sum + channel, 0) / 3 < 220
}

function safeUrl(value: string | undefined, baseUrl: string) {
  if (!value || /^data:/i.test(value)) return undefined
  try {
    const url = new URL(value, baseUrl)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function sanitizeContent($: CheerioAPI, content: Cheerio<AnyNode>, sourceUrl: string) {
  content.find(REMOVED_TAGS).remove()
  content.find('*').addBack().each((_, element) => {
    const node = $(element)
    const attributes = { ...('attribs' in element ? element.attribs : {}) }
    for (const name of Object.keys(attributes)) {
      if (/^on/i.test(name) || ['class', 'id', 'data-src', 'data-original', 'data-backsrc'].includes(name)) {
        node.removeAttr(name)
      }
    }
    const rawStyle = node.attr('style') || ''
    if (/expression\s*\(|javascript:|@import|-moz-binding/i.test(rawStyle)) node.removeAttr('style')
    if (node.is('img')) {
      const src = safeUrl(
        attributes['data-src'] || attributes['data-original'] || attributes['data-backsrc'] || attributes.src,
        sourceUrl,
      )
      if (src) node.attr('src', src)
      else node.remove()
      node.attr('loading', 'lazy')
      node.attr('referrerpolicy', 'no-referrer')
    }
    if (node.is('a')) {
      const href = safeUrl(node.attr('href'), sourceUrl)
      if (href) node.attr('href', href)
      else node.removeAttr('href')
    }
  })
}

function textFrom($: CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const node = $(selector).first()
    const value = node.is('meta') ? node.attr('content') : node.text()
    const normalized = value?.replace(/\s+/g, ' ').trim()
    if (normalized) return normalized
  }
  return ''
}

function analyze($: CheerioAPI, content: Cheerio<AnyNode>): { tokens: ExtractedStyleToken[]; components: ExtractedComponent[] } {
  const root = styleMap(content.attr('style'))
  const paragraph = styleMap(content.find('p').first().attr('style'))
  const headingNode = content.find('h1,h2,h3,h4,h5,h6').first()
  const heading = styleMap(headingNode.attr('style'))
  const headingTag = ((headingNode.get(0) as { tagName?: string } | undefined)?.tagName || 'h2').toLowerCase()
  const headingLevel = headingTag === 'h1' ? 'h1' : headingTag === 'h3' ? 'h3' : 'h2'
  const quote = styleMap(content.find('blockquote').first().attr('style'))
  const listNode = content.find('ul,ol').first()
  const list = styleMap(listNode.attr('style'))
  const listItem = styleMap(listNode.find('li').first().attr('style'))
  const table = styleMap(content.find('table').first().attr('style'))
  const tableHeader = styleMap(content.find('th').first().attr('style'))
  const image = styleMap(content.find('img').first().attr('style'))
  const divider = styleMap(content.find('hr').first().attr('style'))
  const textColors = new Map<string, number>()
  const accentColors = new Map<string, number>()
  const fontSizes = new Map<number, number>()
  const lineHeights = new Map<number, number>()
  const letterSpacings = new Map<number, number>()
  content.find('*').addBack().each((_, element) => {
    const node = $(element)
    const declarations = styleMap(node.attr('style'))
    const directTextLength = Math.max(1, node.clone().children().remove().end().text().trim().length)
    const nodeFontSize = pixels(declarations.get('font-size'))
    const nodeColor = normalizeColor(declarations.get('color'))
    addWeight(textColors, nodeColor, directTextLength)
    if (nodeColor && (isAccentColor(nodeColor) || /bold|[6-9]00/.test(declarations.get('font-weight') || ''))) {
      addWeight(accentColors, nodeColor, Math.min(40, directTextLength))
    }
    addWeight(fontSizes, nodeFontSize, directTextLength)
    addWeight(lineHeights, lineHeight(declarations.get('line-height'), nodeFontSize), directTextLength)
    addWeight(letterSpacings, spacing(declarations.get('letter-spacing'), nodeFontSize), directTextLength)
  })
  const fontSize = pixels(root.get('font-size')) ?? best(fontSizes)
  const resolvedLineHeight = lineHeight(root.get('line-height'), fontSize) ?? best(lineHeights)
  const textColor = normalizeColor(root.get('color')) ?? bestTextColor(textColors)
  const accentColor = normalizeColor(heading.get('color') ?? heading.get('border-color') ?? quote.get('border-left')) ?? best(accentColors)
  const backgroundColor = normalizeColor(root.get('background-color') ?? root.get('background'))
  const letterSpacing = spacing(root.get('letter-spacing'), fontSize) ?? best(letterSpacings)
  const paragraphSpacing = pixels(paragraph.get('margin-bottom'))
  const headingColor = normalizeColor(heading.get('color'))
  const headingBackground = normalizeColor(heading.get('background-color') ?? heading.get('background'))
  const headingBorder = normalizeColor(heading.get('border-color') ?? heading.get('border-left') ?? heading.get('border'))
  const quoteBackground = normalizeColor(quote.get('background-color') ?? quote.get('background'))
  const quoteBorder = normalizeColor(quote.get('border-color') ?? quote.get('border-left') ?? quote.get('border'))
  const quoteColor = normalizeColor(quote.get('color'))
  const listColor = normalizeColor(list.get('color') ?? listItem.get('color'))
  const tableBackground = normalizeColor(tableHeader.get('background-color') ?? tableHeader.get('background'))
  const tableBorder = normalizeColor(tableHeader.get('border-color') ?? tableHeader.get('border') ?? table.get('border'))
  const dividerColor = normalizeColor(divider.get('border-top') ?? divider.get('border-color') ?? divider.get('background-color'))
  const dividerThickness = pixels(divider.get('border-top')?.split(/\s+/)[0]) ?? pixels(divider.get('height'))
  const dividerMargin = pixels(divider.get('margin')?.split(/\s+/)[0]) ?? pixels(divider.get('margin-top'))
  const candidates: Array<ExtractedStyleToken | undefined> = [
    accentColor ? { path: 'global.accentColor', label: '强调色', value: accentColor, displayValue: accentColor, swatch: accentColor, group: 'global' } : undefined,
    textColor ? { path: 'global.textColor', label: '正文色', value: textColor, displayValue: textColor, swatch: textColor, group: 'global' } : undefined,
    backgroundColor ? { path: 'global.backgroundColor', label: '页面底色', value: backgroundColor, displayValue: backgroundColor, swatch: backgroundColor, group: 'global' } : undefined,
    fontSize ? { path: 'global.fontSize', label: '正文字号', value: fontSize, displayValue: `${fontSize} px`, group: 'global' } : undefined,
    resolvedLineHeight ? { path: 'global.lineHeight', label: '正文行高', value: resolvedLineHeight, displayValue: `${resolvedLineHeight} ×`, group: 'global' } : undefined,
    letterSpacing !== undefined ? { path: 'global.letterSpacing', label: '字距', value: letterSpacing, displayValue: `${letterSpacing} px`, group: 'global' } : undefined,
    paragraphSpacing !== undefined ? { path: 'global.paragraphSpacing', label: '段落间距', value: paragraphSpacing, displayValue: `${paragraphSpacing} px`, group: 'global' } : undefined,
    headingColor ? { path: `headings.${headingLevel}.color`, label: `${headingLevel.toUpperCase()} 颜色`, value: headingColor, displayValue: headingColor, swatch: headingColor, group: 'heading' } : undefined,
    pixels(heading.get('font-size')) ? { path: `headings.${headingLevel}.fontSize`, label: `${headingLevel.toUpperCase()} 字号`, value: pixels(heading.get('font-size'))!, displayValue: `${pixels(heading.get('font-size'))} px`, group: 'heading' } : undefined,
    headingBackground ? { path: `headings.${headingLevel}.backgroundColor`, label: `${headingLevel.toUpperCase()} 背景`, value: headingBackground, displayValue: headingBackground, swatch: headingBackground, group: 'heading' } : undefined,
    headingBorder ? { path: `headings.${headingLevel}.borderColor`, label: `${headingLevel.toUpperCase()} 边框`, value: headingBorder, displayValue: headingBorder, swatch: headingBorder, group: 'heading' } : undefined,
    quoteBackground ? { path: 'components.quote.backgroundColor', label: '引用背景', value: quoteBackground, displayValue: quoteBackground, swatch: quoteBackground, group: 'component' } : undefined,
    quoteBorder ? { path: 'components.quote.borderColor', label: '引用边框', value: quoteBorder, displayValue: quoteBorder, swatch: quoteBorder, group: 'component' } : undefined,
    quoteColor ? { path: 'components.quote.color', label: '引用文字', value: quoteColor, displayValue: quoteColor, swatch: quoteColor, group: 'component' } : undefined,
    pixels(quote.get('border-radius')) !== undefined ? { path: 'components.quote.borderRadius', label: '引用圆角', value: pixels(quote.get('border-radius'))!, displayValue: `${pixels(quote.get('border-radius'))} px`, group: 'component' } : undefined,
    listColor ? { path: 'components.list.markerColor', label: '列表标记色', value: listColor, displayValue: listColor, swatch: listColor, group: 'component' } : undefined,
    pixels(list.get('padding-left')) !== undefined ? { path: 'components.list.indent', label: '列表缩进', value: pixels(list.get('padding-left'))!, displayValue: `${pixels(list.get('padding-left'))} px`, group: 'component' } : undefined,
    pixels(listItem.get('margin-bottom')) !== undefined ? { path: 'components.list.itemSpacing', label: '列表项距', value: pixels(listItem.get('margin-bottom'))!, displayValue: `${pixels(listItem.get('margin-bottom'))} px`, group: 'component' } : undefined,
    tableBackground ? { path: 'components.table.headerBackground', label: '表头背景', value: tableBackground, displayValue: tableBackground, swatch: tableBackground, group: 'component' } : undefined,
    tableBorder ? { path: 'components.table.borderColor', label: '表格边框', value: tableBorder, displayValue: tableBorder, swatch: tableBorder, group: 'component' } : undefined,
    pixels(table.get('border-radius')) !== undefined ? { path: 'components.table.borderRadius', label: '表格圆角', value: pixels(table.get('border-radius'))!, displayValue: `${pixels(table.get('border-radius'))} px`, group: 'component' } : undefined,
    pixels(image.get('border-radius')) !== undefined ? { path: 'components.image.borderRadius', label: '图片圆角', value: pixels(image.get('border-radius'))!, displayValue: `${pixels(image.get('border-radius'))} px`, group: 'component' } : undefined,
    image.get('box-shadow') && image.get('box-shadow') !== 'none' ? { path: 'components.image.shadow', label: '图片阴影', value: true, displayValue: '开启', group: 'component' } : undefined,
    dividerColor ? { path: 'components.divider.color', label: '分隔线颜色', value: dividerColor, displayValue: dividerColor, swatch: dividerColor, group: 'component' } : undefined,
    dividerThickness !== undefined ? { path: 'components.divider.thickness', label: '分隔线粗细', value: dividerThickness, displayValue: `${dividerThickness} px`, group: 'component' } : undefined,
    dividerMargin !== undefined ? { path: 'components.divider.margin', label: '分隔线间距', value: dividerMargin, displayValue: `${dividerMargin} px`, group: 'component' } : undefined,
  ]
  const counts: ExtractedComponent[] = [
    { kind: 'heading', label: '章节标题', count: content.find('h1,h2,h3,h4,h5,h6').length },
    { kind: 'quote', label: '引用 / 重点提示', count: content.find('blockquote').length },
    { kind: 'list', label: '内容列表', count: content.find('ul,ol').length },
    { kind: 'table', label: '内容表格', count: content.find('table').length },
    { kind: 'image', label: '文章图片', count: content.find('img').length },
    { kind: 'divider', label: '内容分隔', count: content.find('hr').length },
  ]
  return { tokens: candidates.filter((token): token is ExtractedStyleToken => Boolean(token)), components: counts.filter((item) => item.count > 0) }
}

export function parseWechatArticleHtml(pageHtml: string, sourceUrl: string): ExtractedWechatArticle {
  const $ = load(juice(pageHtml, { removeStyleTags: true, preserveMediaQueries: false }))
  const content = $('#js_content, .rich_media_content, [id^="js_content"]')
    .filter((_, element) => $(element).text().trim().length > 0)
    .first()
  if (!content.length) {
    const pageText = $('body').text().replace(/\s+/g, ' ')
    if (/环境异常|访问过于频繁|安全验证|请完成验证|verify/i.test(pageText)) {
      throw new WechatExtractorError('ARTICLE_BLOCKED', '微信要求安全验证，请稍后重试或换一篇公开文章')
    }
    throw new WechatExtractorError('ARTICLE_NOT_FOUND', '没有找到公众号正文，请确认链接指向一篇公开文章')
  }
  const title = textFrom($, ['#activity-name', '.rich_media_title', 'meta[property="og:title"]', 'title']) || '公众号文章'
  const author = textFrom($, ['#js_name', '.rich_media_meta_text', 'meta[name="author"]']) || '公众号作者'
  const analysis = analyze($, content)
  sanitizeContent($, content, sourceUrl)
  const html = content.html()?.trim() || ''
  if (!html || content.text().replace(/\s+/g, '').length < 10) {
    throw new WechatExtractorError('ARTICLE_NOT_FOUND', '公众号正文为空，无法提取')
  }
  const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' })
  turndown.use(gfm)
  turndown.addRule('strikethrough', { filter: ['del', 's'], replacement: (text) => `~~${text}~~` })
  const markdown = turndown.turndown(html).trim()
  return { sourceUrl, title, author, html, markdown, ...analysis }
}

function normalizeServerUrl(input: string) {
  let url: URL
  try { url = new URL(input.trim()) } catch { throw new WechatExtractorError('INVALID_URL', '请粘贴完整的公众号文章链接') }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'mp.weixin.qq.com') {
    throw new WechatExtractorError('INVALID_URL', '目前仅支持微信公众号文章链接')
  }
  url.hash = ''
  return url
}

export async function fetchWechatArticle(input: string): Promise<ExtractedWechatArticle> {
  let url = normalizeServerUrl(input)
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    let response: Response
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'zh-CN,zh;q=0.9',
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.50',
        },
      })
    } catch {
      throw new WechatExtractorError('FETCH_FAILED', '暂时无法读取这篇文章，请确认文章仍可公开访问')
    } finally {
      clearTimeout(timeout)
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')
      if (!location || redirect === 3) throw new WechatExtractorError('FETCH_FAILED', '文章跳转次数过多，无法安全读取')
      url = normalizeServerUrl(new URL(location, url).toString())
      continue
    }
    if (!response.ok) throw new WechatExtractorError('FETCH_FAILED', `微信返回了 ${response.status}，请稍后重试`)
    const declaredSize = Number(response.headers.get('content-length') || 0)
    if (declaredSize > MAX_ARTICLE_BYTES) throw new WechatExtractorError('ARTICLE_TOO_LARGE', '文章内容过大，暂时无法处理')
    const html = await response.text()
    if (new TextEncoder().encode(html).byteLength > MAX_ARTICLE_BYTES) throw new WechatExtractorError('ARTICLE_TOO_LARGE', '文章内容过大，暂时无法处理')
    return parseWechatArticleHtml(html, url.toString())
  }
  throw new WechatExtractorError('FETCH_FAILED', '无法读取这篇文章')
}
