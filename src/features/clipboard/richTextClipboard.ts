const copiedStyleProperties = [
  'background-color', 'border', 'border-bottom', 'border-collapse', 'border-left', 'border-radius',
  'border-right', 'border-top', 'box-shadow', 'color', 'display', 'font-family',
  'font-size', 'font-style', 'font-weight', 'letter-spacing', 'line-height',
  'list-style-type', 'margin', 'padding', 'text-align', 'text-decoration',
  'text-indent', 'vertical-align', 'white-space',
] as const

function cleanInternalAttributes(element: Element) {
  for (const attribute of Array.from(element.attributes)) {
    if (attribute.name === 'class' || attribute.name.startsWith('data-') || attribute.name.startsWith('aria-')) {
      element.removeAttribute(attribute.name)
    }
  }
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
      .map((property) => `${property}:${computed.getPropertyValue(property)}`)
      .filter((declaration) => !declaration.endsWith(':'))
      .join(';')

    if (inlineStyle) target.setAttribute('style', inlineStyle)
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

  return clone.outerHTML
}

export async function makeImageSourcesPortable(
  html: string,
  resolveSource: (source: string) => Promise<string | undefined>,
) {
  const container = document.createElement('div')
  container.innerHTML = html
  const images = Array.from(container.querySelectorAll<HTMLImageElement>('img[src]'))
  await Promise.all(images.map(async (image) => {
    const resolved = await resolveSource(image.src)
    if (resolved) image.src = resolved
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
  return makeImageSourcesPortable(serializePreviewArticle(article), resolveBlobUrl)
}

export async function copyPreviewArticle(
  article: HTMLElement,
  plainText: string,
  resolveImageSource: (source: string) => Promise<string | undefined> = resolveBlobUrl,
) {
  const clipboard = navigator.clipboard
  if (!clipboard) throw new Error('当前环境不支持剪贴板')

  if (clipboard.write && typeof ClipboardItem !== 'undefined') {
    const html = await makeImageSourcesPortable(serializePreviewArticle(article), resolveImageSource)
    await clipboard.write([new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
    })])
    return
  }

  await clipboard.writeText(plainText)
}
