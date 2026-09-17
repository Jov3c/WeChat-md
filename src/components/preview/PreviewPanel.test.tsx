import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, vi } from 'vitest'
import { builtInStylePresets, type StylePreset } from '../../features/styles/stylePresets'
import { PreviewPanel, type PreviewPanelHandle } from './PreviewPanel'

const renderPreview = (markdown: string, stylePreset: StylePreset = builtInStylePresets[0]) => render(
  <PreviewPanel
    markdown={markdown}
    device="desktop"
    onDeviceChange={() => undefined}
    syncEnabled
    onSyncEnabledChange={() => undefined}
    onBlockActivate={() => undefined}
    settingsOpen
    onShowSettings={() => undefined}
    stylePreset={stylePreset}
  />,
)

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, writable: true, value: undefined })
})

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

  it('scopes the selected article style to the preview content', () => {
    const { container } = renderPreview('# 暖色标题', builtInStylePresets[1])
    const article = container.querySelector('article')

    expect(article).toHaveStyle({ '--article-background': '#fffaf2', '--article-accent': '#9c4f3d' })
    expect(article).toHaveAttribute('data-h2-numbered', 'true')
  })

  it('exposes the selected article layout without changing the markdown', () => {
    const { container } = render(
      <PreviewPanel
        markdown="# 原始正文"
        device="desktop"
        onDeviceChange={() => undefined}
        syncEnabled
        onSyncEnabledChange={() => undefined}
        onBlockActivate={() => undefined}
        settingsOpen
        onShowSettings={() => undefined}
        layoutId="tutorial"
      />,
    )

    expect(container.querySelector('article')).toHaveAttribute('data-template-layout', 'tutorial')
    expect(screen.getByRole('heading', { name: '原始正文' })).toBeVisible()
  })

  it('renders automatic markers for every heading level so numbering styles can be toggled', () => {
    const preset: StylePreset = {
      ...builtInStylePresets[0],
      headings: {
        h1: { ...builtInStylePresets[0].headings.h1, numbered: true },
        h2: { ...builtInStylePresets[0].headings.h2, numbered: true },
        h3: { ...builtInStylePresets[0].headings.h3, numbered: true },
      },
    }
    renderPreview('# 标题\n\n## 小节\n\n### 细节', preset)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('1标题')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('1小节')
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('1.1细节')
  })

  it('preserves author-written heading numbers when automatic numbering is disabled', () => {
    const preset: StylePreset = {
      ...builtInStylePresets[0],
      headings: { ...builtInStylePresets[0].headings, h2: { ...builtInStylePresets[0].headings.h2, numbered: false } },
    }
    renderPreview('## 2. 作者自己的编号', preset)

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('2. 作者自己的编号')
  })

  it('shows image alternative text as a styled caption', () => {
    renderPreview('![流程说明](https://example.com/process.png)')

    expect(screen.getByText('流程说明')).toBeVisible()
  })

  it('renders saved article images from app-owned blob URLs', () => {
    renderPreview('![公众号配图](blob:http://localhost/saved-image)')

    expect(screen.getByRole('img', { name: '公众号配图' })).toHaveAttribute('src', 'blob:http://localhost/saved-image')
  })

  it('does not request stable app asset references before their local URL is ready', () => {
    renderPreview('![待加载配图](asset://saved-image)')

    expect(screen.getByRole('img', { name: '待加载配图' })).not.toHaveAttribute('src')
  })

  it('continues to reject executable image URLs', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    renderPreview('![不安全图片](javascript:alert(1))')

    expect(screen.getByRole('img', { name: '不安全图片' })).not.toHaveAttribute('src')
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('uses the browser highlight registry for the exact selected text', () => {
    const set = vi.fn()
    const remove = vi.fn()
    class TestHighlight {
      constructor(public readonly range: Range) {}
    }
    vi.stubGlobal('CSS', { highlights: { set, delete: remove } })
    vi.stubGlobal('Highlight', TestHighlight)

    render(
      <PreviewPanel
        markdown="这一段包含**精确的重点**文字。"
        device="desktop"
        onDeviceChange={() => undefined}
        syncEnabled
        selection={{ startLine: 1, endLine: 1, text: '包含精确的重点文字' }}
        onSyncEnabledChange={() => undefined}
        onBlockActivate={() => undefined}
        settingsOpen
        onShowSettings={() => undefined}
      />,
    )

    expect(set).toHaveBeenCalledOnce()
    const highlight = set.mock.calls[0][1] as TestHighlight
    expect(highlight.range.toString()).toBe('包含精确的重点文字')
  })

  it('releases a cursor-only block highlight after nine hundred milliseconds', () => {
    vi.useFakeTimers()
    const { rerender } = render(
      <PreviewPanel
        markdown="# 标题"
        device="desktop"
        onDeviceChange={() => undefined}
        syncEnabled
        selection={{ startLine: 1, endLine: 1, text: '' }}
        onSyncEnabledChange={() => undefined}
        onBlockActivate={() => undefined}
        settingsOpen
        onShowSettings={() => undefined}
      />,
    )

    expect(screen.getByRole('heading', { name: '标题' })).toHaveAttribute('data-sync-active', 'true')
    act(() => vi.advanceTimersByTime(901))
    rerender(
      <PreviewPanel
        markdown="# 标题"
        device="desktop"
        onDeviceChange={() => undefined}
        syncEnabled
        selection={{ startLine: 1, endLine: 1, text: '' }}
        onSyncEnabledChange={() => undefined}
        onBlockActivate={() => undefined}
        settingsOpen
        onShowSettings={() => undefined}
      />,
    )
    expect(screen.getByRole('heading', { name: '标题' })).not.toHaveAttribute('data-sync-active')
    vi.useRealTimers()
  })

  it('moves to an overall scroll ratio without relying on source blocks', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    const ref = createRef<PreviewPanelHandle>()
    render(<PreviewPanel ref={ref} markdown="# 第一段\n\n第二段" device="desktop" onDeviceChange={() => undefined} syncEnabled onSyncEnabledChange={() => undefined} onBlockActivate={() => undefined} settingsOpen onShowSettings={() => undefined} />)
    const viewport = screen.getByRole('region', { name: '预览滚动区域' })
    Object.defineProperties(viewport, {
      scrollHeight: { configurable: true, value: 1800 },
      clientHeight: { configurable: true, value: 300 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    })

    act(() => ref.current?.setScrollRatio(0.4))

    expect(viewport.scrollTop).toBe(600)
  })
})
