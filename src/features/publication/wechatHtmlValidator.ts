export type ValidationLevel = 'error' | 'warning' | 'info'

export interface WechatHtmlValidationIssue {
  code: string
  level: ValidationLevel
  message: string
  selector?: string
  suggestion?: string
}

const unsafeTags = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'video', 'audio'] as const
const safeLinkSchemes = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const safeImageSchemes = new Set(['http:', 'https:', 'data:'])

function numericPixels(value: string | null | undefined) {
  const match = /^\s*(\d+(?:\.\d+)?)px\s*$/i.exec(value ?? '')
  return match ? Number(match[1]) : undefined
}

function urlScheme(value: string) {
  const match = /^([a-z][a-z\d+.-]*:)/i.exec(value.trim())
  return match?.[1].toLowerCase()
}

function elementSelector(element: Element) {
  const id = element.getAttribute('id')
  return id ? `${element.tagName.toLowerCase()}#${id}` : element.tagName.toLowerCase()
}

export function validateWechatHtml(html: string): WechatHtmlValidationIssue[] {
  const documentNode = new DOMParser().parseFromString(html, 'text/html')
  const issues: WechatHtmlValidationIssue[] = []
  const seen = new Set<string>()
  const add = (issue: WechatHtmlValidationIssue) => {
    const key = issue.code
    if (seen.has(key)) return
    seen.add(key)
    issues.push(issue)
  }

  unsafeTags.forEach((tag) => {
    if (!documentNode.querySelector(tag)) return
    add({
      code: `unsafe-tag-${tag}`,
      level: 'error',
      message: `最终 HTML 包含微信公众号不支持的 <${tag}> 标签`,
      selector: tag,
      suggestion: `删除 <${tag}> 内容，或改用普通文本、图片和基础排版元素。`,
    })
  })

  documentNode.body.querySelectorAll('*').forEach((element) => {
    const eventAttribute = Array.from(element.attributes).find((attribute) => /^on/i.test(attribute.name))
    if (!eventAttribute) return
    add({
      code: 'unsafe-event-handler',
      level: 'error',
      message: `最终 HTML 包含事件属性 ${eventAttribute.name}`,
      selector: elementSelector(element),
      suggestion: '删除 onclick、onload 等事件属性，公众号内容必须是无脚本的静态 HTML。',
    })
  })

  documentNode.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    const source = image.getAttribute('src')?.trim() ?? ''
    const selector = elementSelector(image)
    if (!source) {
      add({ code: 'invalid-image-url', level: 'error', message: '最终 HTML 中存在没有有效地址的图片', selector, suggestion: '重新插入图片或删除空图片。' })
      return
    }
    if (source.startsWith('asset://')) {
      add({ code: 'unresolved-asset-url', level: 'error', message: '最终 HTML 中仍有未转换的本地图片资源', selector, suggestion: '等待图片转换完成，或从图片资源库重新插入。' })
      return
    }
    if (source.startsWith('blob:')) {
      add({ code: 'unresolved-blob-url', level: 'error', message: '最终 HTML 中仍有只能在当前页面使用的临时图片地址', selector, suggestion: '重新复制，让应用把临时图片转换为可携带格式。' })
      return
    }
    const scheme = urlScheme(source)
    if (scheme === 'data:' && !/^data:image\/(?:png|jpe?g|gif|webp|bmp|avif);/i.test(source)) {
      add({ code: 'unsafe-image-scheme', level: 'error', message: '图片 data URL 不是受支持的安全位图类型', selector, suggestion: '将图片转换为 JPG、PNG、GIF、WebP、BMP 或 AVIF 后重新插入。' })
    } else if (scheme && !safeImageSchemes.has(scheme)) {
      add({ code: 'unsafe-image-scheme', level: 'error', message: `图片使用了不安全的地址协议：${scheme}`, selector, suggestion: '图片仅使用 HTTPS 地址或本地转换后的 data:image 地址。' })
    } else if (!scheme && !source.startsWith('//')) {
      add({ code: 'invalid-image-url', level: 'error', message: '图片使用了无法在微信公众号中独立访问的相对地址', selector, suggestion: '将图片下载到资源库后重新插入。' })
    }

    if (scheme === 'data:' && /;base64,/i.test(source)) {
      const payload = source.slice(source.indexOf(',') + 1)
      const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0
      const estimatedBytes = Math.max(0, Math.floor(payload.length * 3 / 4) - padding)
      if (estimatedBytes > 5 * 1024 * 1024) {
        add({ code: 'oversized-image', level: 'warning', message: `图片数据约 ${(estimatedBytes / 1024 / 1024).toFixed(1)}MB，粘贴或保存草稿时可能失败`, selector, suggestion: '将图片压缩到 5MB 以内后重新插入。' })
      }
    }

    const width = numericPixels(image.style.width) ?? Number(image.getAttribute('width') || 0)
    if (width > 1200) {
      add({ code: 'oversized-image', level: 'warning', message: `图片声明宽度为 ${width}px，可能超出公众号正文区域`, selector, suggestion: '将图片宽度设置为 100% 或不超过正文宽度。' })
    }
  })

  documentNode.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
    const href = link.getAttribute('href')?.trim() ?? ''
    const selector = elementSelector(link)
    if (!href) {
      add({ code: 'empty-link', level: 'warning', message: '文章中存在没有目标地址的链接', selector, suggestion: '补充链接地址，或将其改为普通文字。' })
      return
    }
    if (href.startsWith('#')) return
    const scheme = urlScheme(href)
    if (!scheme || !safeLinkSchemes.has(scheme)) {
      add({ code: 'unsafe-url-scheme', level: 'error', message: `链接使用了不安全或无法识别的地址：${href.slice(0, 80)}`, selector, suggestion: '链接仅使用 HTTPS、HTTP、mailto 或 tel 地址。' })
    }
  })

  documentNode.querySelectorAll<HTMLElement>('*[style]').forEach((element) => {
    const selector = elementSelector(element)
    const rawStyle = element.getAttribute('style') ?? ''
    const position = element.style.position.toLowerCase()
    if (['fixed', 'absolute', 'sticky'].includes(position)) {
      add({ code: 'position-layout', level: 'warning', message: `检测到 position: ${position}，微信公众号可能改变元素位置`, selector, suggestion: '改用普通文档流、边距或表格布局。' })
    }
    if (element.style.cssFloat && element.style.cssFloat !== 'none') {
      add({ code: 'float-layout', level: 'warning', message: '检测到 float 布局，粘贴后可能错位', selector, suggestion: '改用块级元素顺序排列。' })
    }
    const display = element.style.display.toLowerCase()
    if (display.includes('grid')) {
      add({ code: 'grid-layout', level: 'warning', message: '检测到 Grid 布局，微信公众号可能移除相关样式', selector, suggestion: '复杂分栏改为单列或基础表格结构。' })
    }
    if (display === 'flex' && element.children.length >= 2) {
      add({ code: 'flex-layout', level: 'warning', message: '检测到 Flex 布局，微信公众号可能重新排列内容', selector, suggestion: '重要内容优先使用单列块级布局。' })
    }
    if (element.style.transform && element.style.transform !== 'none') {
      add({ code: 'transform-style', level: 'warning', message: '检测到 transform，粘贴后装饰位置可能变化', selector, suggestion: '移除位移、缩放或旋转效果。' })
    }
    if (element.style.overflow === 'hidden' || element.style.overflowX === 'hidden' || element.style.overflowY === 'hidden') {
      add({ code: 'clipped-overflow', level: 'warning', message: '检测到 overflow: hidden，微信公众号中可能裁剪正文', selector, suggestion: '确认内容不会依赖溢出显示，或移除裁剪样式。' })
    }
    if (/var\s*\(\s*--/i.test(rawStyle)) {
      add({ code: 'css-variable', level: 'warning', message: '检测到 CSS 变量，微信公众号不会保留变量定义', selector, suggestion: '将 CSS 变量转换为具体颜色、尺寸或字体值。' })
    }
  })

  if (documentNode.querySelector('link[rel~="stylesheet" i]')) {
    add({ code: 'external-stylesheet', level: 'warning', message: '最终 HTML 依赖外部样式表', selector: 'link[rel="stylesheet"]', suggestion: '将必要样式转换为行内样式。' })
  }
  const embeddedCss = Array.from(documentNode.querySelectorAll('style')).map((style) => style.textContent ?? '').join('\n')
  const inlineCss = Array.from(documentNode.querySelectorAll<HTMLElement>('[style]')).map((element) => element.getAttribute('style') ?? '').join('\n')
  if (/@media\b/i.test(embeddedCss)) add({ code: 'media-query', level: 'warning', message: '检测到 @media，微信公众号可能移除响应式规则', suggestion: '使用无需媒体查询也能阅读的单列布局。' })
  if (/@keyframes\b/i.test(embeddedCss)) add({ code: 'keyframes-animation', level: 'warning', message: '检测到 @keyframes，微信公众号不会可靠保留动画', suggestion: '改用静态样式。' })
  if (/@font-face\b/i.test(embeddedCss) || /font-family\s*:[^;]*(?:url\(|https?:)/i.test(`${embeddedCss}\n${inlineCss}`)) {
    add({ code: 'external-font', level: 'warning', message: '检测到外部字体依赖', suggestion: '使用系统字体栈，避免文字样式在微信中丢失。' })
  }

  documentNode.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((heading) => {
    if (!heading.textContent?.trim()) add({ code: 'empty-heading', level: 'warning', message: '文章中存在空标题', selector: elementSelector(heading), suggestion: '补充标题文字或删除空标题。' })
  })

  documentNode.querySelectorAll<HTMLElement>('table').forEach((table) => {
    const width = numericPixels(table.style.width) ?? Number(table.getAttribute('width') || 0)
    if (width > 800) add({ code: 'wide-table', level: 'warning', message: `表格宽度为 ${width}px，手机端可能横向溢出`, selector: 'table', suggestion: '减少列数或使用自适应宽度。' })
  })
  documentNode.querySelectorAll<HTMLElement>('pre').forEach((pre) => {
    const width = numericPixels(pre.style.width) ?? Number(pre.getAttribute('width') || 0)
    if (width > 800) add({ code: 'wide-code-block', level: 'warning', message: `代码块宽度为 ${width}px，手机端可能横向溢出`, selector: 'pre', suggestion: '移除固定宽度，并允许代码块横向滚动或换行。' })
  })

  const elements = Array.from(documentNode.body.querySelectorAll('*'))
  const deepest = elements.reduce((maximum, element) => {
    let depth = 0
    let current: Element | null = element
    while (current && current !== documentNode.body) { depth += 1; current = current.parentElement }
    return Math.max(maximum, depth)
  }, 0)
  if (deepest > 12) add({ code: 'deep-dom', level: 'warning', message: `HTML 嵌套达到 ${deepest} 层，微信清洗后结构可能变化`, suggestion: '简化多层容器，保留必要的语义结构。' })

  const imageCount = documentNode.querySelectorAll('img').length
  if (imageCount > 12) add({ code: 'many-images', level: 'info', message: `文章包含 ${imageCount} 张图片，建议在微信草稿中逐张确认`, suggestion: '粘贴后保存草稿并重新打开，检查所有图片。' })
  const textLength = documentNode.body.textContent?.trim().length ?? 0
  if (textLength > 20_000) add({ code: 'long-article', level: 'info', message: `文章约 ${textLength} 字，建议重点检查长文末尾内容`, suggestion: '保存微信草稿后重新打开，并检查手机预览。' })
  const tableCount = documentNode.querySelectorAll('table').length
  if (tableCount > 3) add({ code: 'many-tables', level: 'info', message: `文章包含 ${tableCount} 个表格`, suggestion: '逐个检查表格在手机预览中的宽度和可读性。' })

  return issues
}
