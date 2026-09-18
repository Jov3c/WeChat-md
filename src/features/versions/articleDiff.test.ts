import { createLineDiff } from './articleDiff'

describe('article line diff', () => {
  it('reports changed lines with stable old and new line numbers', () => {
    expect(createLineDiff('第一行\n旧内容\n最后一行', '第一行\n新内容\n最后一行')).toEqual([
      { kind: 'context', text: '第一行', oldLine: 1, newLine: 1 },
      { kind: 'removed', text: '旧内容', oldLine: 2 },
      { kind: 'added', text: '新内容', newLine: 2 },
      { kind: 'context', text: '最后一行', oldLine: 3, newLine: 3 },
    ])
  })

  it('handles additions, removals and blank lines without changing the input', () => {
    const historical = '# 标题\n\n正文'
    const current = '# 标题\n\n新增说明\n正文'

    expect(createLineDiff(historical, current)).toEqual([
      { kind: 'context', text: '# 标题', oldLine: 1, newLine: 1 },
      { kind: 'context', text: '', oldLine: 2, newLine: 2 },
      { kind: 'added', text: '新增说明', newLine: 3 },
      { kind: 'context', text: '正文', oldLine: 3, newLine: 4 },
    ])
    expect(historical).toBe('# 标题\n\n正文')
    expect(current).toBe('# 标题\n\n新增说明\n正文')
  })

  it('returns no rows for identical or empty content', () => {
    expect(createLineDiff('', '')).toEqual([])
    expect(createLineDiff('# 相同\n', '# 相同')).toEqual([])
  })
})
