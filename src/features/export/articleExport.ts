export interface TextExport {
  filename: string
  mimeType: string
  content: string
}

export function safeExportFileName(title: string) {
  return title
    .replace(/[\\/]+/g, '-')
    .replace(/[<>:"|?*\u0000-\u001f]/g, '')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '') || '未命名文章'
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function createMarkdownExport(title: string, content: string): TextExport {
  return { filename: `${safeExportFileName(title)}.md`, mimeType: 'text/markdown;charset=utf-8', content }
}

export function createHtmlExport(title: string, articleHtml: string): TextExport {
  const safeTitle = escapeHtml(title)
  return {
    filename: `${safeExportFileName(title)}.html`,
    mimeType: 'text/html;charset=utf-8',
    content: `<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${safeTitle}</title>\n</head>\n<body style="margin:0;background:#FAF9F5">\n${articleHtml}\n</body>\n</html>`,
  }
}

export function downloadTextExport(file: TextExport) {
  const url = URL.createObjectURL(new Blob([file.content], { type: file.mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = file.filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
