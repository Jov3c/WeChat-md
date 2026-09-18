const copiedStyleProperties = [
  'background-color', 'border', 'border-bottom', 'border-collapse', 'border-left', 'border-radius',
  'border-right', 'border-top', 'box-shadow', 'color', 'display', 'font-family',
  'font-size', 'font-style', 'font-weight', 'letter-spacing', 'line-height',
  'list-style-type', 'margin', 'padding', 'text-align', 'text-decoration',
  'text-indent', 'vertical-align', 'white-space',
] as const

function customPropertyValue(element: HTMLElement, name: string) {
  let current: HTMLElement | null = element
  while (current) {
    const inline = current.style.getPropertyValue(name).trim()
    if (inline) return inline
    const computed = window.getComputedStyle(current).getPropertyValue(name).trim()
    if (computed) return computed
    current = current.parentElement
  }
  return ''
}

function splitVariableArguments(value: string) {
  let depth = 0
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '(') depth += 1
    else if (value[index] === ')') depth -= 1
    else if (value[index] === ',' && depth === 0) return [value.slice(0, index), value.slice(index + 1)] as const
  }
  return [value, ''] as const
}

function resolveCssVariables(element: HTMLElement, value: string, recursion = 0): string {
  if (recursion > 8) return ''
  let resolved = value
  while (resolved.includes('var(')) {
    const start = resolved.indexOf('var(')
    let depth = 1
    let end = start + 4
    for (; end < resolved.length && depth > 0; end += 1) {
      if (resolved[end] === '(') depth += 1
      else if (resolved[end] === ')') depth -= 1
    }
    if (depth !== 0) return ''
    const [name, fallback] = splitVariableArguments(resolved.slice(start + 4, end - 1))
    const replacement = customPropertyValue(element, name.trim()) || fallback.trim()
    if (!replacement) return ''
    resolved = `${resolved.slice(0, start)}${resolveCssVariables(element, replacement, recursion + 1)}${resolved.slice(end)}`
  }
  return resolved.trim()
}

function cleanInternalAttributes(element: Element) {
  for (const attribute of Array.from(element.attributes)) {
    if (attribute.name === 'class' || attribute.name.startsWith('data-') || attribute.name.startsWith('aria-')) {
      element.removeAttribute(attribute.name)
    }
  }
}

function flattenNestedLists(root: HTMLElement) {
  const nestedLists = Array.from(root.querySelectorAll<HTMLElement>('li > ul, li > ol')).reverse()
  nestedLists.forEach((nestedList) => {
    const parentItem = nestedList.parentElement
    const parentList = parentItem?.parentElement
    if (!parentItem || !parentList || parentItem.tagName !== 'LI' || !['UL', 'OL'].includes(parentList.tagName)) return
    const insertionPoint = parentItem.nextSibling
    Array.from(nestedList.children).forEach((child) => {
      if (child.tagName === 'LI') parentList.insertBefore(child, insertionPoint)
    })
    nestedList.remove()
  })
}

function unwrapPreviewTableContainers(root: HTMLElement) {
  Array.from(root.querySelectorAll<HTMLElement>('div')).forEach((container) => {
    if (container.children.length !== 1 || container.firstElementChild?.tagName !== 'TABLE') return
    container.replaceWith(container.firstElementChild)
  })
}

function createClipboardBoundary() {
  const boundary = document.createElement('p')
  boundary.style.fontSize = '0'
  boundary.style.lineHeight = '0'
  boundary.style.margin = '0'
  boundary.innerHTML = '&nbsp;'
  return boundary
}

function textDirection(element: HTMLElement) {
  let current: HTMLElement | null = element
  while (current) {
    const direction = (current.style.direction || current.getAttribute('dir') || '').toLowerCase()
    if (direction === 'rtl' || direction === 'ltr') return direction
    current = current.parentElement
  }
  return 'ltr'
}

function normalizeLogicalTextAlignment(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
    const alignment = element.style.textAlign.trim().toLowerCase()
    if (alignment !== 'start' && alignment !== 'end') return
    const isRtl = textDirection(element) === 'rtl'
    const physicalAlignment = alignment === 'start'
      ? (isRtl ? 'right' : 'left')
      : (isRtl ? 'left' : 'right')
    element.style.textAlign = physicalAlignment
  })
}

function wrapDirectBlockTextForWechat(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('p,h1,h2,h3,h4,h5,h6,li,td,th,blockquote').forEach((block) => {
    if (block.closest('pre,code')) return
    Array.from(block.childNodes).forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) return
      const leaf = document.createElement('span')
      leaf.setAttribute('leaf', '')
      leaf.textContent = node.textContent
      node.replaceWith(leaf)
    })
  })
}

function normalizeWechatClipboardStructure(root: HTMLElement) {
  unwrapPreviewTableContainers(root)
  flattenNestedLists(root)
  normalizeLogicalTextAlignment(root)
  wrapDirectBlockTextForWechat(root)
  root.prepend(createClipboardBoundary())
  root.append(createClipboardBoundary())
  return root.innerHTML
}

export function serializePreviewArticle(article: HTMLElement) {
  const clone = article.cloneNode(true) as HTMLElement
  const sourceElements = [article, ...Array.from(article.querySelectorAll<HTMLElement>('*'))]
  const clonedElements = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]

  sourceElements.forEach((source, index) => {
    const target = clonedElements[index]
    if (!target) return

    const computed = window.getComputedStyle(source)
    const inlineStyle = copiedStyleProperties
      .map((property) => [property, resolveCssVariables(source, computed.getPropertyValue(property))] as const)
      .filter(([, value]) => value)
      .map(([property, value]) => `${property}:${value}`)
      .join(';')

    if (inlineStyle) target.setAttribute('style', inlineStyle)
    if (source instanceof HTMLImageElement && target instanceof HTMLImageElement) {
      target.setAttribute('style', `${inlineStyle ? `${inlineStyle};` : ''}max-width:100%;height:auto`)
    }
    cleanInternalAttributes(target)
  })

  sourceElements.forEach((source, index) => {
    if (source.tagName !== 'LI') return
    const target = clonedElements[index]
    if (!(target instanceof HTMLElement)) return
    const parent = source.parentElement
    const itemIndex = parent ? Array.from(parent.children).indexOf(source) + 1 : 1
    const marker = document.createElement('span')
    const markerColor = getComputedStyle(source).getPropertyValue('--article-list-marker').trim() || getComputedStyle(source).color
    marker.textContent = parent?.tagName === 'OL' ? `${itemIndex}.` : '•'
    marker.style.color = markerColor
    marker.style.marginRight = '0.45em'
    target.style.listStyleType = 'none'
    target.prepend(marker)
  })

  return normalizeWechatClipboardStructure(clone)
}

export async function makeImageSourcesPortable(
  html: string,
  resolveSource: (source: string) => Promise<string | undefined>,
) {
  const container = document.createElement('div')
  container.innerHTML = html
  const images = Array.from(container.querySelectorAll<HTMLImageElement>('img[src]'))
  await Promise.all(images.map(async (image) => {
    try {
      const resolved = await resolveSource(image.src)
      if (resolved) image.src = resolved
    } catch {
      // Leave the original URL in place so the validator can identify this image.
    }
  }))
  return container.innerHTML
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(reader.error ?? new Error('无法读取本地图片')))
    reader.readAsDataURL(blob)
  })
}

async function resolveBlobUrl(source: string) {
  if (!source.startsWith('blob:')) return undefined
  const response = await fetch(source)
  if (!response.ok) return undefined
  return blobToDataUrl(await response.blob())
}

export function serializePortablePreviewArticle(article: HTMLElement) {
  return preparePreviewArticleForClipboard(article)
}

export function prepareSerializedArticleForClipboard(
  html: string,
  resolveImageSource: (source: string) => Promise<string | undefined> = resolveBlobUrl,
) {
  return makeImageSourcesPortable(html, resolveImageSource)
}

export function preparePreviewArticleForClipboard(
  article: HTMLElement,
  resolveImageSource: (source: string) => Promise<string | undefined> = resolveBlobUrl,
) {
  return prepareSerializedArticleForClipboard(serializePreviewArticle(article), resolveImageSource)
}

function renderedPlainText(html: string) {
  const container = document.createElement('div')
  container.innerHTML = html
  return (container.innerText || container.textContent || '')
    .replace(/\u00a0/g, '')
    .trim()
    .replace(/^([ \t]{0,3})(#{1,6}|[-+*>]|\d+[.)])(?=[ \t])/gm, '$1$2\u200b')
    .replace(/^([ \t]*)(`{3,}|~{3,})/gm, '$1$2\u200b')
}

export async function copyPreparedArticle(html: string, _sourceMarkdown?: string) {
  const clipboard = navigator.clipboard
  if (!clipboard) throw new Error('当前环境不支持剪贴板')

  if (!clipboard.write || typeof ClipboardItem === 'undefined') {
    throw new Error('当前环境不支持复制富文本，请使用最新版浏览器或桌面端')
  }

  await clipboard.write([new ClipboardItem({
    'text/html': new Blob([html], { type: 'text/html' }),
    'text/plain': new Blob([renderedPlainText(html)], { type: 'text/plain' }),
  })])
}

export async function copyPreviewArticle(
  article: HTMLElement,
  plainText: string,
  resolveImageSource: (source: string) => Promise<string | undefined> = resolveBlobUrl,
) {
  const html = await preparePreviewArticleForClipboard(article, resolveImageSource)
  await copyPreparedArticle(html, plainText)
}
