import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { App } from './App'

describe('WeChat MD application shell', () => {
  const setScrollMetrics = (element: HTMLElement, scrollHeight: number, clientHeight: number, scrollTop: number) => {
    Object.defineProperties(element, {
      scrollHeight: { configurable: true, value: scrollHeight },
      clientHeight: { configurable: true, value: clientHeight },
      scrollTop: { configurable: true, writable: true, value: scrollTop },
    })
  }

  it('renders the four workspace regions beneath the application chrome', () => {
    render(<App />)

    expect(screen.getByRole('navigation', { name: '文章导航' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Markdown 编辑器' })).toBeVisible()
    expect(screen.getByRole('region', { name: '公众号预览' })).toBeVisible()
    expect(screen.getByRole('region', { name: '排版设置' })).toBeVisible()
  })

  it('keeps fixed navigation controls outside the independently scrollable article list', () => {
    render(<App />)

    const articleList = screen.getByRole('region', { name: '可滚动文章列表' })
    expect(articleList).toContainElement(screen.getByRole('button', { name: /AI 工具推荐清单/ }))
    expect(articleList).not.toContainElement(screen.getByRole('textbox', { name: '搜索文章' }))
    expect(articleList).not.toContainElement(screen.getByRole('button', { name: /全部文章/ }))

  })

  it('hides and restores the right sidebar while exposing the expanded workspace state', async () => {
    const user = userEvent.setup()
    render(<App />)

    const workspace = screen.getByRole('region', { name: '编辑工作区' })
    await user.click(screen.getByRole('button', { name: '隐藏右侧边栏' }))

    expect(workspace).toHaveAttribute('data-settings-open', 'false')
    expect(screen.queryByRole('region', { name: /^排版设置$/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '显示右侧边栏' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: '显示右侧边栏' }))
    expect(workspace).toHaveAttribute('data-settings-open', 'true')
    expect(screen.getByRole('region', { name: /^排版设置$/ })).toBeVisible()
    expect(screen.getByRole('button', { name: '隐藏右侧边栏' })).toHaveFocus()
  })

  it('keeps article edits when the user switches away and returns', async () => {
    const user = userEvent.setup()
    render(<App />)

    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' })
    await user.clear(editor)
    await user.type(editor, '# 修改后仍然存在')
    await user.click(screen.getByRole('button', { name: /AI 工具推荐清单/ }))
    await user.click(screen.getByRole('button', { name: /在本地运行大语言模型/ }))

    expect(editor).toHaveValue('# 修改后仍然存在')
  })

  it('creates and selects a new article in the article library', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '新建文章' }))

    expect(screen.getByRole('textbox', { name: 'Markdown 内容' })).toHaveValue('')
    expect(screen.getByRole('button', { name: /未命名文章/ })).toBeVisible()
  })

  it('imports a Markdown file as a new editable article', async () => {
    const user = userEvent.setup()
    render(<App />)
    const file = new File(['# 导入成功\n\n文件正文'], '导入文章.md', { type: 'text/markdown' })

    await user.upload(screen.getByLabelText('选择 Markdown 文件'), file)

    expect(await screen.findByRole('heading', { name: '导入成功' })).toBeVisible()
    expect(screen.getByRole('button', { name: /导入文章/ })).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Markdown 内容' })).toHaveValue('# 导入成功\n\n文件正文')
  })

  it('copies both rich HTML and plain text for WeChat', async () => {
    const user = userEvent.setup()
    const write = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write, writeText } })
    class TestClipboardItem {
      constructor(public readonly data: Record<string, Blob>) {}
    }
    vi.stubGlobal('ClipboardItem', TestClipboardItem)
    render(<App />)

    await user.click(screen.getByRole('button', { name: '复制到公众号' }))

    await waitFor(() => expect(write).toHaveBeenCalledTimes(1))
    const item = write.mock.calls[0][0][0] as TestClipboardItem
    expect(Object.keys(item.data).sort()).toEqual(['text/html', 'text/plain'])
    expect(item.data['text/html'].type).toBe('text/html')
    expect(item.data['text/plain'].type).toBe('text/plain')
  })

  it('prevents copying an empty article', async () => {
    const user = userEvent.setup()
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write, writeText: vi.fn() } })
    render(<App />)
    await user.click(screen.getByRole('button', { name: '新建文章' }))

    await user.click(screen.getByRole('button', { name: '复制到公众号' }))

    expect(write).not.toHaveBeenCalled()
    expect(await screen.findByText('文章内容为空')).toBeVisible()
  })

  it('maps the editor cursor to the matching preview block', () => {
    render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' }) as HTMLTextAreaElement
    const offset = editor.value.indexOf('## 2. 安装 Ollama')

    editor.setSelectionRange(offset, offset)
    fireEvent.select(editor)

    expect(screen.getByRole('heading', { name: '2 安装 Ollama' })).toHaveAttribute('data-sync-active', 'true')
  })

  it('tracks the selected source text on its preview block', () => {
    render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' }) as HTMLTextAreaElement
    const selectedText = '开源的本地大模型'
    const start = editor.value.indexOf(selectedText)

    editor.setSelectionRange(start, start + selectedText.length)
    fireEvent.select(editor)

    const preview = within(screen.getByRole('region', { name: '公众号预览' }))
    const previewText = preview.getByText(/Ollama 是一个开源的本地大模型运行工具/)
    expect(previewText).toHaveAttribute('data-selection-active', 'true')
    expect(previewText).toHaveAttribute('data-selected-text', selectedText)
  })

  it('moves the editor selection to a clicked preview block', async () => {
    const user = userEvent.setup()
    render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' }) as HTMLTextAreaElement
    const expectedStart = editor.value.indexOf('## 2. 安装 Ollama')

    await user.click(screen.getByRole('heading', { name: '2 安装 Ollama' }))

    expect(editor).toHaveFocus()
    expect(editor.selectionStart).toBe(expectedStart)
  })

  it('lets the user disable and re-enable intelligent synchronization', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '双栏同步已开启' }))
    expect(screen.getByRole('button', { name: '双栏同步已关闭' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: '双栏同步已关闭' }))
    expect(screen.getByRole('button', { name: '双栏同步已开启' })).toBeVisible()
  })

  it('keeps preview scroll position aligned with editor progress', () => {
    render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' })
    const previewScroller = screen.getByRole('region', { name: '预览滚动区域' })
    setScrollMetrics(editor, 1000, 200, 400)
    setScrollMetrics(previewScroller, 2000, 400, 0)

    fireEvent.scroll(editor)

    expect(previewScroller.scrollTop).toBe(800)
  })

  it('keeps editor scroll position aligned with manual preview scrolling', () => {
    render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' })
    const previewScroller = screen.getByRole('region', { name: '预览滚动区域' })
    setScrollMetrics(editor, 1000, 200, 0)
    setScrollMetrics(previewScroller, 2000, 400, 1200)

    fireEvent.scroll(previewScroller)

    expect(editor.scrollTop).toBe(600)
  })

  it('stops linking scroll positions while intelligent synchronization is disabled', async () => {
    const user = userEvent.setup()
    render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' })
    const previewScroller = screen.getByRole('region', { name: '预览滚动区域' })
    setScrollMetrics(editor, 1000, 200, 400)
    setScrollMetrics(previewScroller, 2000, 400, 0)
    await user.click(screen.getByRole('button', { name: '双栏同步已开启' }))

    fireEvent.scroll(editor)

    expect(previewScroller.scrollTop).toBe(0)
  })

  it('connects article selection and editor changes to application state', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /AI 工具推荐清单/ }))
    expect(screen.getByRole('button', { name: /AI 工具推荐清单/ })).toHaveAttribute('aria-current', 'page')

    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' })
    await user.clear(editor)
    await user.type(editor, '# 新标题')
    expect(screen.getByText('5 字')).toBeVisible()
  })

  it('switches preview device and settings section', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '手机预览' }))
    expect(screen.getByRole('region', { name: '公众号预览' })).toHaveAttribute('data-device', 'mobile')

    await user.click(screen.getByRole('tab', { name: '组件' }))
    expect(screen.getByText('组件样式')).toBeVisible()

    await user.click(screen.getByRole('tab', { name: '页面设置' }))
    expect(screen.getByRole('heading', { name: '页面设置' })).toBeVisible()
    expect(screen.queryByText('当前风格')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: '可滚动设置内容' })).toBeVisible()
  })
})
