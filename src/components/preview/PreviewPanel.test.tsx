import { render, screen } from '@testing-library/react'
import { PreviewPanel } from './PreviewPanel'

const renderPreview = (markdown: string) => render(
  <PreviewPanel
    markdown={markdown}
    device="desktop"
    onDeviceChange={() => undefined}
    syncEnabled
    onSyncEnabledChange={() => undefined}
    onBlockActivate={() => undefined}
    settingsOpen
    onShowSettings={() => undefined}
  />,
)

describe('Markdown preview', () => {
  it('renders the current Markdown content instead of fixed demo content', () => {
    renderPreview('# 实时标题\n\n这是刚刚输入的正文。')

    expect(screen.getByRole('heading', { name: '实时标题' })).toBeVisible()
    expect(screen.getByText('这是刚刚输入的正文。')).toBeVisible()
    expect(screen.queryByText(/Ollama 完全指南/)).not.toBeInTheDocument()
  })

  it('supports the GFM elements required by the product baseline', () => {
    const { container } = renderPreview([
      '~~已删除~~和**重点**',
      '',
      '> 一段引用',
      '',
      '| 名称 | 状态 |',
      '| --- | --- |',
      '| 预览 | 完成 |',
    ].join('\n'))

    expect(container.querySelector('del')).toHaveTextContent('已删除')
    expect(screen.getByText('重点').tagName).toBe('STRONG')
    expect(container.querySelector('blockquote')).toHaveTextContent('一段引用')
    expect(screen.getByRole('table')).toBeVisible()
  })

  it('exposes source line metadata for future editor and preview synchronization', () => {
    renderPreview('# 第一段\n\n第二段')

    const heading = screen.getByRole('heading', { name: '第一段' })
    expect(heading).toHaveAttribute('data-source-start', '1')
    expect(screen.getByText('第二段')).toHaveAttribute('data-source-start', '3')
  })

  it('does not execute or render raw HTML from Markdown', () => {
    const { container } = renderPreview('<script>alert("xss")</script>\n\n安全正文')

    expect(container.querySelector('script')).not.toBeInTheDocument()
    expect(screen.getByText('安全正文')).toBeVisible()
  })
})
