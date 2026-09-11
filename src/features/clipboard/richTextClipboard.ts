const copiedStyleProperties = [
  'background-color', 'border', 'border-collapse', 'border-radius', 'color', 'font-family',
  'font-size', 'font-style', 'font-weight', 'letter-spacing', 'line-height',
  'list-style-type', 'margin', 'padding', 'text-align', 'text-decoration',
  'vertical-align', 'white-space',
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

  return clone.outerHTML
}

export async function copyPreviewArticle(article: HTMLElement, plainText: string) {
  const clipboard = navigator.clipboard
  if (!clipboard) throw new Error('当前环境不支持剪贴板')

  if (clipboard.write && typeof ClipboardItem !== 'undefined') {
    const html = serializePreviewArticle(article)
    await clipboard.write([new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
    })])
    return
  }

  await clipboard.writeText(plainText)
}
