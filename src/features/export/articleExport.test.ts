import { createHtmlExport, createMarkdownExport, safeExportFileName } from './articleExport'

describe('article export', () => {
  it('creates a safe markdown filename without changing content', () => {
    expect(safeExportFileName('微信：排版 / 入门?')).toBe('微信：排版 - 入门')
    expect(createMarkdownExport('微信：排版 / 入门?', '# 正文')).toEqual({
      filename: '微信：排版 - 入门.md', mimeType: 'text/markdown;charset=utf-8', content: '# 正文',
    })
  })

  it('wraps styled preview markup in a standalone html document', () => {
    const result = createHtmlExport('我的文章', '<article style="color:red"><h1>标题</h1></article>')
    expect(result.filename).toBe('我的文章.html')
    expect(result.content).toContain('<meta charset="utf-8">')
    expect(result.content).toContain('<title>我的文章</title>')
    expect(result.content).toContain('<article style="color:red">')
  })
})
