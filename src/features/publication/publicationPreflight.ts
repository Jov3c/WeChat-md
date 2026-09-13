export type PublicationIssueCode =
  | 'missing-image'
  | 'failed-image'
  | 'unresolved-asset'
  | 'incompatible-content'

export interface PublicationIssue {
  code: PublicationIssueCode
  message: string
}

function countMessage(count: number, suffix: string) {
  return '有 ' + count + ' 张图片' + suffix
}

export function inspectPublication(article: HTMLElement, markdown: string): PublicationIssue[] {
  const images = Array.from(article.querySelectorAll<HTMLImageElement>('img'))
  const missing = images.filter((image) => !image.getAttribute('src'))
  const unresolved = images.filter((image) => image.getAttribute('src')?.startsWith('asset://'))
  const failed = images.filter((image) => {
    const source = image.getAttribute('src')
    return Boolean(source && !source.startsWith('asset://') && image.complete && image.naturalWidth === 0)
  })
  const issues: PublicationIssue[] = []

  if (missing.length) issues.push({ code: 'missing-image', message: countMessage(missing.length, '缺少地址') })
  if (failed.length) issues.push({ code: 'failed-image', message: countMessage(failed.length, '加载失败') })
  if (unresolved.length) issues.push({ code: 'unresolved-asset', message: '有 ' + unresolved.length + ' 张本地图片尚未转换' })
  if (/<\/?(?:iframe|video|audio|form|script|style)\b/i.test(markdown)) {
    issues.push({ code: 'incompatible-content', message: '文章包含公众号可能不支持的内容' })
  }

  return issues
}
