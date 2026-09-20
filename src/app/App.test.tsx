import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, vi } from 'vitest'
import { createMemoryArticleRepository } from '../features/articles/articleRepository'
import { createMemoryAssetRepository } from '../features/assets/assetRepository'
import { createMemoryVersionRepository } from '../features/versions/versionRepository'
import { createMemoryRecoveryRepository } from '../features/recovery/recoveryRepository'
import type { ExtractedWechatArticle } from '../features/wechat/wechatExtraction'
import type { FileService, RuntimeServices } from '../platform/contracts'
import { App } from './App'

const { legacyOllamaMarkdown } = vi.hoisted(() => ({ legacyOllamaMarkdown: `# 在本地运行大语言模型：Ollama 完全指南

Ollama 是一个简单易用的工具，让你可以在本地运行各种开源大语言模型。

## 1. 什么是 Ollama？

Ollama 是一个开源的本地大模型运行工具，支持多种模型。

## 2. 安装 Ollama

### 2.1 下载安装

按照系统提示完成安装，然后启动本地服务。` }))

vi.mock('./demoData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./demoData')>()
  return {
    ...actual,
    replaceLegacyDemoArticles: <T,>(storedArticles: T[]) => storedArticles,
    articles: [
      { id: 'ollama', title: '在本地运行大语言模型：Ollama 完全指南', date: '今天 15:42', content: legacyOllamaMarkdown, templateId: 'tutorial' },
      { id: 'ai-tools', title: 'AI 工具推荐清单', date: '2024-01-15', content: '# AI 工具推荐清单\n\n整理我日常使用的效率工具。', favorite: true },
      { id: 'markdown', title: '如何高效使用 Markdown', date: '2024-01-12', content: '# 如何高效使用 Markdown\n\n从结构开始，而不是从样式开始。' },
      { id: 'knowledge', title: '从 0 开始搭建个人知识库', date: '2024-01-10', content: '# 从 0 开始搭建个人知识库' },
      { id: 'chatgpt', title: 'ChatGPT 使用心得', date: '2024-01-08', content: '# ChatGPT 使用心得' },
      { id: 'annual', title: '我的年度总结', date: '2024-01-05', content: '# 我的年度总结' },
      { id: 'efficiency', title: '好用的效率工具', date: '2024-01-03', content: '# 好用的效率工具' },
      { id: 'layout', title: '微信公众号排版技巧', date: '2024-01-01', content: '# 微信公众号排版技巧' },
    ],
  }
})

describe('WeChat MD application shell', () => {
  afterEach(() => vi.unstubAllGlobals())

  const setScrollMetrics = (element: HTMLElement, scrollHeight: number, clientHeight: number, scrollTop: number) => {
    Object.defineProperties(element, {
      scrollHeight: { configurable: true, value: scrollHeight },
      clientHeight: { configurable: true, value: clientHeight },
      scrollTop: { configurable: true, writable: true, value: scrollTop },
    })
  }

  const runtimeWithFiles = (files: FileService): RuntimeServices => ({
    kind: 'desktop',
    articleRepository: createMemoryArticleRepository(),
    assetRepository: createMemoryAssetRepository(),
    versionRepository: createMemoryVersionRepository(),
    recoveryRepository: null,
    extractWechatArticle: async () => { throw new Error('not used') },
    files,
  })

  const unusedFileService = (): FileService => ({
    openText: async () => null,
    openBytes: async () => null,
    saveText: async () => 'cancelled',
    saveBytes: async () => 'cancelled',
  })

  it('uses repositories supplied by the initialized runtime', async () => {
    const articleRepository = createMemoryArticleRepository({
      articles: [{ id: 'desktop-1', title: '桌面数据库文章', date: '今天', content: '# 已恢复' }],
      selectedId: 'desktop-1',
    })
    const services: RuntimeServices = {
      kind: 'desktop', articleRepository,
      assetRepository: createMemoryAssetRepository(), versionRepository: createMemoryVersionRepository(),
      recoveryRepository: null,
      extractWechatArticle: async () => { throw new Error('not used') },
      files: unusedFileService(),
    }

    render(<App services={services} />)

    expect(await screen.findByRole('button', { name: /^桌面数据库文章，/ })).toBeVisible()
  })

  it('uses the native window title on desktop and gives its space to the workspace', async () => {
    render(<App services={runtimeWithFiles(unusedFileService())} />)

    expect(await screen.findByRole('region', { name: '编辑工作区' })).toBeVisible()
    expect(screen.queryByText('专注于更好的公众号写作体验')).not.toBeInTheDocument()
    expect(screen.queryByText('WeChat MD Editor')).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('data-runtime', 'desktop')
  })

  it('blocks the browser context menu in the desktop runtime', async () => {
    render(<App services={runtimeWithFiles(unusedFileService())} />)

    const application = await screen.findByRole('main')
    const contextMenu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    application.dispatchEvent(contextMenu)

    expect(contextMenu.defaultPrevented).toBe(true)
  })

  it('opens desktop software settings with the current article image directory', async () => {
    const user = userEvent.setup()
    const services = {
      ...runtimeWithFiles(unusedFileService()),
      imageArchive: {
        getDirectory: async () => 'E:\\Apps\\WeChat MD',
        chooseDirectory: async () => null,
        resetDirectory: async () => 'E:\\Apps\\WeChat MD',
        saveArticle: async () => ({ directory: '', saved: 0 }),
        openDirectory: async () => undefined,
      },
    } as RuntimeServices
    render(<App services={services} />)

    await user.click(await screen.findByRole('button', { name: '设置' }))

    expect(screen.getByRole('dialog', { name: '软件设置' })).toBeVisible()
    expect(screen.getByText('E:\\Apps\\WeChat MD')).toBeVisible()
  })

  it('imports Markdown through the runtime file service', async () => {
    const user = userEvent.setup()
    const files: FileService = {
      ...unusedFileService(),
      openText: async () => ({ name: '原生导入.md', content: '# 原生文件内容' }),
    }
    render(<App services={runtimeWithFiles(files)} />)

    await user.click(await screen.findByRole('button', { name: '导入 MD' }))

    expect(await screen.findByRole('button', { name: /^原生导入，/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('textbox', { name: 'Markdown 内容' })).toHaveValue('# 原生文件内容')
  })

  it('exports exact Markdown data through the runtime file service', async () => {
    const user = userEvent.setup()
    let saved: Parameters<FileService['saveText']>[0] | undefined
    const files: FileService = {
      ...unusedFileService(),
      saveText: async (file) => { saved = file; return 'saved' },
    }
    render(<App services={runtimeWithFiles(files)} />)
    await screen.findByRole('button', { name: /^在本地运行大语言模型.*，/ })

    await user.click(screen.getByRole('button', { name: '更多操作' }))
    await user.click(screen.getByRole('menuitem', { name: '导出 Markdown' }))

    await waitFor(() => expect(saved).toEqual({
      filename: '在本地运行大语言模型：Ollama 完全指南.md',
      mimeType: 'text/markdown;charset=utf-8',
      content: expect.stringContaining('# 在本地运行大语言模型：Ollama 完全指南'),
    }))
  })

  it('silently cancels a workspace restore file dialog', async () => {
    const user = userEvent.setup()
    let openCount = 0
    const files: FileService = {
      ...unusedFileService(),
      openBytes: async () => { openCount += 1; return null },
    }
    render(<App services={runtimeWithFiles(files)} />)
    await screen.findByRole('button', { name: /^在本地运行大语言模型.*，/ })

    await user.click(screen.getByRole('button', { name: '更多操作' }))
    await user.click(screen.getByRole('menuitem', { name: '恢复备份' }))

    expect(openCount).toBe(1)
    expect(screen.queryByText(/备份恢复失败|文件已损坏|不支持的备份/)).not.toBeInTheDocument()
  })

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
    expect(articleList).toContainElement(screen.getByRole('button', { name: /^AI 工具推荐清单，/ }))
    expect(articleList).not.toContainElement(screen.getByRole('textbox', { name: '搜索文章' }))
    expect(articleList).not.toContainElement(screen.getByRole('button', { name: /全部文章/ }))

  })

  it('hides and restores the right sidebar while exposing the expanded workspace state', async () => {
    const user = userEvent.setup()
    render(<App />)

    const workspace = screen.getByRole('region', { name: '编辑工作区' })
    const settings = screen.getByRole('region', { name: /^排版设置$/ })
    await user.click(screen.getByRole('button', { name: '隐藏右侧边栏' }))

    expect(workspace).toHaveAttribute('data-settings-open', 'false')
    expect(screen.queryByRole('region', { name: /^排版设置$/ })).not.toBeInTheDocument()
    expect(settings).toHaveAttribute('data-open', 'false')
    expect(settings).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('button', { name: '显示右侧边栏' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: '显示右侧边栏' }))
    expect(workspace).toHaveAttribute('data-settings-open', 'true')
    expect(settings).toHaveAttribute('data-open', 'true')
    expect(settings).not.toHaveAttribute('aria-hidden')
    expect(screen.getByRole('button', { name: '隐藏右侧边栏' })).toHaveFocus()
  })

  it('filters the article list from the fixed search field', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: '搜索文章' }), 'AI 工具')

    expect(screen.getByRole('button', { name: /^AI 工具推荐清单，/ })).toBeVisible()
    expect(screen.queryByRole('button', { name: /^在本地运行大语言模型.*，/ })).not.toBeInTheDocument()
  })

  it('filters the article list by collection and reports a real count', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('button', { name: '全部文章 8' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: '收藏 1' }))

    expect(screen.getByRole('button', { name: /^AI 工具推荐清单，/ })).toBeVisible()
    expect(screen.queryByRole('button', { name: /^在本地运行大语言模型.*，/ })).not.toBeInTheDocument()
  })

  it('renames and duplicates an article from its article menu', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '管理 AI 工具推荐清单' }))
    await user.click(screen.getByRole('menuitem', { name: '重命名' }))
    const dialog = within(screen.getByRole('dialog', { name: '重命名文章' }))
    await user.clear(dialog.getByRole('textbox', { name: '文章标题' }))
    await user.type(dialog.getByRole('textbox', { name: '文章标题' }), '我的工具清单')
    await user.click(dialog.getByRole('button', { name: '保存名称' }))

    expect(screen.getByRole('button', { name: /^我的工具清单，/ })).toBeVisible()
    await user.click(screen.getByRole('button', { name: '管理 我的工具清单' }))
    await user.click(screen.getByRole('menuitem', { name: '创建副本' }))
    expect(screen.getByRole('button', { name: /^我的工具清单 副本，/ })).toHaveAttribute('aria-current', 'page')
  })

  it('moves an article to trash and restores it', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '管理 AI 工具推荐清单' }))
    await user.click(screen.getByRole('menuitem', { name: '移入回收站' }))
    expect(screen.queryByRole('button', { name: /^AI 工具推荐清单，/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '回收站 1' }))
    expect(screen.getByRole('button', { name: /^AI 工具推荐清单，/ })).toBeVisible()
    await user.click(screen.getByRole('button', { name: '管理 AI 工具推荐清单' }))
    await user.click(screen.getByRole('menuitem', { name: '恢复文章' }))
    expect(screen.getByText('没有找到文章')).toBeVisible()
  })

  it('shows the Markdown outline and focuses the selected heading in the editor', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: '大纲' }))
    expect(screen.queryByRole('button', { name: '前往 macOS' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '前往 2.1 下载安装' }))

    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' }) as HTMLTextAreaElement
    expect(screen.getByRole('tab', { name: '编辑' })).toHaveAttribute('aria-selected', 'true')
    expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toContain('### 2.1 下载安装')
  })

  it('expands and exits the editor fullscreen layout', async () => {
    const user = userEvent.setup()
    render(<App />)
    const workspace = screen.getByRole('region', { name: '编辑工作区' })

    await user.click(screen.getByRole('button', { name: '全屏编辑' }))
    expect(workspace).toHaveAttribute('data-editor-fullscreen', 'true')
    await user.click(screen.getByRole('button', { name: '退出全屏编辑' }))
    expect(workspace).toHaveAttribute('data-editor-fullscreen', 'false')
  })

  it('recognizes the first Markdown heading as the title of a new article', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '新建文章' }))
    await user.click(screen.getByRole('button', { name: '新建空白文章' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Markdown 内容' }), {
      target: { value: '# 自动识别的标题\n\n正文' },
    })

    expect(screen.getByRole('button', { name: /^自动识别的标题，/ })).toHaveAttribute('aria-current', 'page')
  })

  it('applies a unified tutorial style without changing the article content or article count', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' }) as HTMLTextAreaElement
    const originalContent = editor.value
    const originalArticleCount = screen.getAllByRole('button', { name: /，/ }).length

    await user.click(screen.getByRole('button', { name: '风格' }))
    await user.click(screen.getByRole('menuitem', { name: '教程 · 清晰' }))

    expect(editor.value).toBe(originalContent)
    expect(screen.getAllByRole('button', { name: /，/ })).toHaveLength(originalArticleCount)
    expect(container.querySelector('article')).toHaveAttribute('data-template-layout', 'tutorial')
  })

  it('applies an information style without creating another article', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' }) as HTMLTextAreaElement
    const originalContent = editor.value

    await user.click(screen.getByRole('button', { name: '风格' }))
    await user.click(screen.getByRole('menuitem', { name: '资讯 · 清爽' }))

    expect(editor.value).toBe(originalContent)
    expect(container.querySelector('article')).toHaveAttribute('data-template-layout', 'information')
  })

  it('saves current content as a template and uses it to create a new article', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' })
    fireEvent.change(editor, { target: { value: '# 我的固定结构\n\n## 第一部分' } })

    await user.click(screen.getByRole('button', { name: '风格' }))
    await user.click(screen.getByRole('menuitem', { name: '新闻 · 严谨' }))

    await user.click(screen.getByRole('button', { name: '更多操作' }))
    await user.click(screen.getByRole('menuitem', { name: '保存当前为模板' }))
    const dialog = within(screen.getByRole('dialog', { name: '保存为模板' }))
    fireEvent.change(dialog.getByRole('textbox', { name: '模板名称' }), {
      target: { value: '我的长文模板' },
    })
    await user.click(dialog.getByRole('button', { name: '保存模板' }))

    await user.click(screen.getByRole('button', { name: '风格' }))
    await user.click(screen.getByRole('menuitem', { name: '教程 · 清晰' }))
    expect(container.querySelector('article')).toHaveAttribute('data-template-layout', 'tutorial')

    const articleCount = screen.getAllByRole('button', { name: /，/ }).length
    await user.click(screen.getByRole('button', { name: '新建文章' }))
    await user.click(screen.getByRole('button', { name: '使用 我的长文模板' }))
    expect(screen.getByRole('textbox', { name: 'Markdown 内容' })).toHaveValue('# 我的固定结构\n\n## 第一部分')
    expect(container.querySelector('article')).toHaveAttribute('data-template-layout', 'news')
    expect(screen.getAllByRole('button', { name: /，/ })).toHaveLength(articleCount + 1)
  })

  it('renames and deletes a custom template from the template library', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '更多操作' }))
    await user.click(screen.getByRole('menuitem', { name: '保存当前为模板' }))
    let dialog = within(screen.getByRole('dialog', { name: '保存为模板' }))
    await user.type(dialog.getByRole('textbox', { name: '模板名称' }), '待管理模板')
    await user.click(dialog.getByRole('button', { name: '保存模板' }))

    await user.click(screen.getByRole('button', { name: '更多操作' }))
    await user.click(screen.getByRole('menuitem', { name: '管理模板' }))
    await user.click(screen.getByRole('button', { name: '管理 待管理模板' }))
    await user.click(screen.getByRole('menuitem', { name: '重命名模板' }))
    dialog = within(screen.getByRole('dialog', { name: '重命名模板' }))
    await user.clear(dialog.getByRole('textbox', { name: '模板名称' }))
    await user.type(dialog.getByRole('textbox', { name: '模板名称' }), '长期模板')
    await user.click(dialog.getByRole('button', { name: '保存名称' }))
    expect(screen.getByText('长期模板')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '管理 长期模板' }))
    await user.click(screen.getByRole('menuitem', { name: '删除模板' }))
    dialog = within(screen.getByRole('dialog', { name: '删除模板' }))
    await user.click(dialog.getByRole('button', { name: '确认删除' }))
    expect(screen.queryByText('长期模板')).not.toBeInTheDocument()
  })

  it('protects unsaved style changes before creating a new article', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '标题样式' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'H1 字号' }), { target: { value: '40' } })

    await user.click(screen.getByRole('button', { name: '新建文章' }))
    expect(screen.getByRole('dialog', { name: '未保存的风格修改' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /^未命名文章，/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '放弃并继续' }))
    await user.click(screen.getByRole('button', { name: '新建空白文章' }))
    expect(screen.getByRole('button', { name: /^未命名文章，/ })).toHaveAttribute('aria-current', 'page')
  })

  it('protects unsaved style changes before importing Markdown', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '标题样式' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'H1 字号' }), { target: { value: '40' } })

    await user.click(screen.getByRole('button', { name: '导入 MD' }))
    await user.upload(screen.getByLabelText('导入 Markdown'), new File(['# 导入内容'], '外部文章.md', { type: 'text/markdown' }))
    expect(screen.getByRole('dialog', { name: '未保存的风格修改' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /^外部文章，/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '放弃并继续' }))
    expect(await screen.findByRole('button', { name: /^外部文章，/ })).toHaveAttribute('aria-current', 'page')
  })

  it('permanently deletes an article from the trash after confirmation', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '管理 AI 工具推荐清单' }))
    await user.click(screen.getByRole('menuitem', { name: '移入回收站' }))
    await user.click(screen.getByRole('button', { name: '回收站 1' }))
    await user.click(screen.getByRole('button', { name: '管理 AI 工具推荐清单' }))
    await user.click(screen.getByRole('menuitem', { name: '永久删除' }))

    const dialog = within(screen.getByRole('dialog', { name: '永久删除文章' }))
    await user.click(dialog.getByRole('button', { name: '确认删除' }))
    expect(screen.getByRole('button', { name: '回收站 0' })).toBeVisible()
  })

  it('updates favorite and published article collections from the article menu', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '管理 AI 工具推荐清单' }))
    await user.click(screen.getByRole('menuitem', { name: '取消收藏' }))
    expect(screen.getByRole('button', { name: '收藏 0' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: '管理 如何高效使用 Markdown' }))
    await user.click(screen.getByRole('menuitem', { name: '标记为已发布' }))
    expect(screen.getByRole('button', { name: '已发布 1' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: '已发布 1' }))
    expect(screen.getByRole('button', { name: /^如何高效使用 Markdown，/ })).toBeVisible()
  })

  it('keeps article edits when the user switches away and returns', async () => {
    const user = userEvent.setup()
    render(<App />)

    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' })
    await user.clear(editor)
    await user.type(editor, '# 修改后仍然存在')
    await user.click(screen.getByRole('button', { name: /^AI 工具推荐清单，/ }))
    await user.click(screen.getByRole('button', { name: /^在本地运行大语言模型.*，/ }))

    expect(editor).toHaveValue('# 修改后仍然存在')
  })

  it('restores the saved article library when the application starts', async () => {
    const repository = createMemoryArticleRepository({
      articles: [{ id: 'persisted', title: '本地文章', date: '刚刚', content: '# 已恢复内容' }],
      selectedId: 'persisted',
    })

    render(<App articleRepository={repository} saveDelay={0} />)

    expect(await screen.findByRole('textbox', { name: 'Markdown 内容' })).toHaveValue('# 已恢复内容')
  })

  it('offers and restores a newer crash recovery draft on startup', async () => {
    const user = userEvent.setup()
    const articleRepository = createMemoryArticleRepository({
      articles: [{ id: 'persisted', title: '正式标题', date: '刚刚', content: '# 正式正文' }],
      selectedId: 'persisted',
    })
    const recoveryRepository = createMemoryRecoveryRepository({
      articleId: 'persisted', title: '恢复标题', content: '# 异常退出前内容',
      updatedAt: '2026-09-18T08:00:05.000Z', savedAt: '2026-09-18T08:00:00.000Z',
    })

    render(<App articleRepository={articleRepository} recoveryRepository={recoveryRepository} />)

    const dialog = await screen.findByRole('dialog', { name: '发现未保存的草稿' })
    await user.click(within(dialog).getByRole('button', { name: '恢复草稿' }))

    expect(screen.getByRole('textbox', { name: 'Markdown 内容' })).toHaveValue('# 异常退出前内容')
    expect(screen.getByRole('button', { name: /^恢复标题，/ })).toBeVisible()
  })

  it('restores custom templates and content components with the workspace', async () => {
    const user = userEvent.setup()
    const repository = createMemoryArticleRepository({
      articles: [{ id: 'persisted', title: '本地文章', date: '刚刚', content: '# 已恢复内容' }],
      selectedId: 'persisted',
      templates: [{ id: 'saved-template', name: '长期模板', description: '自定义文章结构', content: '# 固定结构', layoutId: 'standard', builtIn: false }],
      components: [{ id: 'saved-component', name: '固定结尾', description: '自定义内容块', content: '**感谢阅读**', builtIn: false }],
    })

    render(<App articleRepository={repository} saveDelay={0} />)
    await screen.findByRole('textbox', { name: 'Markdown 内容' })
    await user.click(screen.getByRole('button', { name: '新建文章' }))
    expect(screen.getByRole('button', { name: '使用 长期模板' })).toBeVisible()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('tab', { name: '组件' }))
    await user.click(screen.getByRole('button', { name: '我的' }))
    expect(screen.getByText('固定结尾')).toBeVisible()
  })

  it('does not expose editable workspace content until the saved library has loaded', async () => {
    let resolveLoad: (snapshot: Awaited<ReturnType<ReturnType<typeof createMemoryArticleRepository>['load']>>) => void = () => undefined
    const repository = {
      load: () => new Promise<Awaited<ReturnType<ReturnType<typeof createMemoryArticleRepository>['load']>>>((resolve) => { resolveLoad = resolve }),
      save: vi.fn().mockResolvedValue(undefined),
    }
    render(<App articleRepository={repository} />)

    expect(screen.queryByRole('textbox', { name: 'Markdown 内容' })).not.toBeInTheDocument()
    await act(async () => resolveLoad({ articles: [{ id: 'ready', title: '加载完成', date: '刚刚', content: '# 安全恢复' }], selectedId: 'ready' }))

    expect(await screen.findByRole('textbox', { name: 'Markdown 内容' })).toHaveValue('# 安全恢复')
  })

  it('automatically saves edits and reports the save state without a toast', async () => {
    const repository = createMemoryArticleRepository()
    const firstSession = render(<App articleRepository={repository} saveDelay={0} />)
    const editor = await screen.findByRole('textbox', { name: 'Markdown 内容' })

    fireEvent.change(editor, { target: { value: '# 自动保存成功' } })

    expect(screen.getByText('保存中…')).toBeVisible()
    expect(await screen.findByText(/^已保存 \d{2}:\d{2}$/)).toBeVisible()
    expect(screen.queryByText('文章已保存')).not.toBeInTheDocument()

    firstSession.unmount()
    render(<App articleRepository={repository} saveDelay={0} />)
    expect(await screen.findByRole('textbox', { name: 'Markdown 内容' })).toHaveValue('# 自动保存成功')
  })

  it('reports completed saves when React strict mode remounts effects in development', async () => {
    const repository = createMemoryArticleRepository()
    render(<StrictMode><App articleRepository={repository} saveDelay={0} /></StrictMode>)
    const editor = await screen.findByRole('textbox', { name: 'Markdown 内容' })

    fireEvent.change(editor, { target: { value: '# 严格模式保存' } })

    expect(await screen.findByText(/^已保存 \d{2}:\d{2}$/)).toBeVisible()
  })

  it('waits five seconds after the last edit before saving', async () => {
    vi.useFakeTimers()
    const repository = createMemoryArticleRepository({
      articles: [{ id: 'timed', title: '定时保存', date: '刚刚', content: '# 保存前' }],
      selectedId: 'timed',
    })

    try {
      render(<App articleRepository={repository} />)
      await act(async () => { await Promise.resolve(); await Promise.resolve() })
      const editor = screen.getByRole('textbox', { name: 'Markdown 内容' })
      fireEvent.change(editor, { target: { value: '# 五秒后保存' } })

      await act(async () => { await vi.advanceTimersByTimeAsync(4999) })
      expect((await repository.load())?.articles[0].content).toBe('# 保存前')

      await act(async () => { await vi.advanceTimersByTimeAsync(1) })
      expect((await repository.load())?.articles[0].content).toBe('# 五秒后保存')
    } finally {
      vi.useRealTimers()
    }
  })

  it('flushes the newest edit when the page is being left before the debounce finishes', async () => {
    const repository = createMemoryArticleRepository({
      articles: [{ id: 'leaving', title: '离开前保存', date: '刚刚', content: '# 旧内容' }],
      selectedId: 'leaving',
    })
    render(<App articleRepository={repository} />)
    const editor = await screen.findByRole('textbox', { name: 'Markdown 内容' })
    fireEvent.change(editor, { target: { value: '# 离开前的新内容' } })

    fireEvent(window, new Event('pagehide'))

    await waitFor(async () => expect((await repository.load())?.articles[0].content).toBe('# 离开前的新内容'))
  })

  it('serializes slow saves so an older snapshot cannot overwrite a newer edit', async () => {
    const initial = { articles: [{ id: 'slow', title: '慢速保存', date: '刚刚', content: '# 初始' }], selectedId: 'slow' }
    const saves: Array<{ content: string; resolve: () => void }> = []
    const repository = {
      load: vi.fn().mockResolvedValue(initial),
      save: vi.fn((snapshot: typeof initial) => new Promise<void>((resolve) => {
        saves.push({ content: snapshot.articles[0].content, resolve })
      })),
    }
    render(<App articleRepository={repository} saveDelay={0} />)
    const editor = await screen.findByRole('textbox', { name: 'Markdown 内容' })
    await waitFor(() => expect(saves).toHaveLength(1))
    await act(async () => saves[0].resolve())

    fireEvent.change(editor, { target: { value: '# 第一版' } })
    await waitFor(() => expect(saves).toHaveLength(2))
    fireEvent.change(editor, { target: { value: '# 最终版' } })
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
    expect(saves).toHaveLength(2)

    await act(async () => saves[1].resolve())
    await waitFor(() => expect(saves).toHaveLength(3))
    expect(saves[2].content).toBe('# 最终版')
    await act(async () => saves[2].resolve())
  })

  it('creates and selects a new article in the article library', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '新建文章' }))
    await user.click(screen.getByRole('button', { name: '新建空白文章' }))

    expect(screen.getByRole('textbox', { name: 'Markdown 内容' })).toHaveValue('')
    expect(screen.getByRole('button', { name: /^未命名文章，/ })).toBeVisible()
  })

  it('imports a Markdown file as a new editable article', async () => {
    const user = userEvent.setup()
    render(<App />)
    const file = new File(['# 导入成功\n\n文件正文'], '导入文章.md', { type: 'text/markdown' })

    await user.click(screen.getByRole('button', { name: '导入 MD' }))
    await user.upload(screen.getByLabelText('导入 Markdown'), file)

    expect(await screen.findByRole('heading', { name: '导入成功' })).toBeVisible()
    expect(screen.getByRole('button', { name: /^导入文章，/ })).toBeVisible()
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
    const copiedHtml = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => resolve(String(reader.result)))
      reader.addEventListener('error', () => reject(reader.error))
      reader.readAsText(item.data['text/html'])
    })
    const copiedContent = document.createElement('div')
    copiedContent.innerHTML = copiedHtml
    expect(copiedContent.querySelector('article')).toBeNull()
    expect(copiedContent.firstElementChild?.tagName).toBe('P')
    expect(copiedContent.lastElementChild?.tagName).toBe('P')
  })

  it('prevents copying an empty article', async () => {
    const user = userEvent.setup()
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write, writeText: vi.fn() } })
    render(<App />)
    await user.click(screen.getByRole('button', { name: '新建文章' }))
    await user.click(screen.getByRole('button', { name: '新建空白文章' }))

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

  it('keeps editor selection highlighting available when intelligent synchronization is disabled', async () => {
    const user = userEvent.setup()
    render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' }) as HTMLTextAreaElement
    const selectedText = '开源的本地大模型'
    const start = editor.value.indexOf(selectedText)
    await user.click(screen.getByRole('button', { name: '双栏同步已开启' }))

    editor.setSelectionRange(start, start + selectedText.length)
    fireEvent.select(editor)

    const preview = within(screen.getByRole('region', { name: '公众号预览' }))
    const previewText = preview.getByText(/Ollama 是一个开源的本地大模型运行工具/)
    expect(previewText).toHaveAttribute('data-selection-active', 'true')
    expect(previewText).toHaveAttribute('data-selected-text', selectedText)
  })

  it('locates the matching preview block from an editor selection even when scroll synchronization is disabled', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    const user = userEvent.setup()
    render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' }) as HTMLTextAreaElement
    const previewScroller = screen.getByRole('region', { name: '预览滚动区域' })
    const target = screen.getByRole('heading', { name: '2 安装 Ollama' })
    setScrollMetrics(previewScroller, 2000, 400, 0)
    vi.spyOn(previewScroller, 'getBoundingClientRect').mockReturnValue({ top: 100, bottom: 500, height: 400, left: 0, right: 600, width: 600, x: 0, y: 100, toJSON: () => ({}) })
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: 700, bottom: 760, height: 60, left: 0, right: 600, width: 600, x: 0, y: 700, toJSON: () => ({}) })
    await user.click(screen.getByRole('button', { name: '双栏同步已开启' }))
    const offset = editor.value.indexOf('## 2. 安装 Ollama')

    editor.setSelectionRange(offset, offset)
    fireEvent.select(editor)

    expect(previewScroller.scrollTop).toBe(430)
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

  it('keeps preview click-to-locate available when intelligent synchronization is disabled', async () => {
    const user = userEvent.setup()
    render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' }) as HTMLTextAreaElement
    const expectedStart = editor.value.indexOf('## 2. 安装 Ollama')
    await user.click(screen.getByRole('button', { name: '双栏同步已开启' }))

    await user.click(screen.getByRole('heading', { name: '2 安装 Ollama' }))

    expect(editor).toHaveFocus()
    expect(editor.selectionStart).toBe(expectedStart)
  })

  it('links editor scrolling to the same overall progress in the preview', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' }) as HTMLTextAreaElement
    const previewScroller = screen.getByRole('region', { name: '预览滚动区域' })
    setScrollMetrics(editor, 1000, 200, 400)
    setScrollMetrics(previewScroller, 2000, 400, 0)

    fireEvent.scroll(editor)

    expect(previewScroller.scrollTop).toBe(800)
  })

  it('links preview scrolling back to the same overall progress in the editor', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' }) as HTMLTextAreaElement
    const previewScroller = screen.getByRole('region', { name: '预览滚动区域' })
    setScrollMetrics(editor, 1000, 200, 0)
    setScrollMetrics(previewScroller, 2000, 400, 400)

    fireEvent.scroll(previewScroller)

    expect(editor.scrollTop).toBe(200)
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

  it('restores the saved intelligent synchronization preference', async () => {
    const repository = createMemoryArticleRepository({
      articles: [{ id: 'saved', title: '已保存', date: '刚刚', content: '# 内容' }],
      selectedId: 'saved',
      syncEnabled: false,
    })

    render(<App articleRepository={repository} />)

    expect(await screen.findByRole('button', { name: '双栏同步已关闭' })).toBeVisible()
  })

  it('opens page settings from every settings entry instead of leaving inert buttons', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '隐藏右侧边栏' }))
    await user.click(screen.getByRole('button', { name: '预览设置' }))
    expect(screen.getByRole('tab', { name: '页面设置' })).toHaveAttribute('data-state', 'active')

    await user.click(screen.getByRole('button', { name: '设置' }))
    expect(screen.getByRole('combobox', { name: '公众号文章保存方式' })).toBeVisible()
  })

  it('exposes useful actions from both overflow menus', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '更多操作' }))
    await user.click(screen.getByRole('menuitem', { name: '管理风格' }))
    expect(screen.getByRole('region', { name: '风格库' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: '预览更多操作' }))
    await user.click(screen.getByRole('menuitem', { name: '页面设置' }))
    expect(screen.getByRole('tab', { name: '页面设置' })).toHaveAttribute('data-state', 'active')
  })

  it('warns about failed images before copying and lets the user continue explicitly', async () => {
    const user = userEvent.setup()
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write, writeText: vi.fn() } })
    class TestClipboardItem {
      constructor(public readonly data: Record<string, Blob>) {}
    }
    vi.stubGlobal('ClipboardItem', TestClipboardItem)
    render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Markdown 内容' }), { target: { value: '# 图片测试\n\n![示例](broken.png)' } })
    const image = document.querySelector<HTMLImageElement>('article img')
    expect(image).not.toBeNull()
    Object.defineProperties(image!, {
      complete: { configurable: true, value: true },
      naturalWidth: { configurable: true, value: 0 },
    })

    await user.click(screen.getByRole('button', { name: '复制到公众号' }))

    const dialog = screen.getByRole('dialog', { name: '发布前检查' })
    expect(dialog).toBeVisible()
    expect(within(dialog).getByText(/图片使用了无法在微信公众号中独立访问的相对地址/)).toBeVisible()
    expect(write).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '仍然复制' }))
    await waitFor(() => expect(write).toHaveBeenCalledOnce())
  })

  it('validates the final portable HTML and explains compatibility notices before copying', async () => {
    const user = userEvent.setup()
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write, writeText: vi.fn() } })
    class TestClipboardItem {
      constructor(public readonly data: Record<string, Blob>) {}
    }
    vi.stubGlobal('ClipboardItem', TestClipboardItem)
    render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Markdown 内容' }), {
      target: { value: `# 长文章\n\n${'长内容'.repeat(7000)}` },
    })

    await user.click(screen.getByRole('button', { name: '复制到公众号' }))

    const dialog = await screen.findByRole('dialog', { name: '发布前检查' })
    expect(within(dialog).getByText('提示')).toBeVisible()
    expect(within(dialog).getByText(/文章约.*字/)).toBeVisible()
    expect(within(dialog).getByText(/保存微信草稿后重新打开/)).toBeVisible()
    expect(write).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: '仍然复制' }))
    await waitFor(() => expect(write).toHaveBeenCalledOnce())
  })

  it('discards a prepared clipboard payload when the article changes during image conversion', async () => {
    const user = userEvent.setup()
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write } })
    class TestClipboardItem {
      constructor(public readonly data: Record<string, Blob>) {}
    }
    vi.stubGlobal('ClipboardItem', TestClipboardItem)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/slow-image')
    let finishFetch: (response: Response) => void = () => undefined
    const fetchImage = vi.fn(() => new Promise<Response>((resolve) => { finishFetch = resolve }))
    vi.stubGlobal('fetch', fetchImage)
    const articleRepository = createMemoryArticleRepository({
      articles: [{ id: 'race', title: '复制竞态', date: '刚刚', content: '# 旧内容\n\n![图片](asset://image-1)' }],
      selectedId: 'race',
    })
    const assetRepository = createMemoryAssetRepository([{
      id: 'image-1', name: '图片.png', mimeType: 'image/png', size: 5, createdAt: '2026-09-17T00:00:00.000Z', source: 'file', blob: new Blob(['image'], { type: 'image/png' }),
    }])
    render(<App articleRepository={articleRepository} assetRepository={assetRepository} />)

    await waitFor(() => expect(document.querySelector('article img')).toHaveAttribute('src', 'blob:http://localhost/slow-image'))
    await user.click(screen.getByRole('button', { name: '复制到公众号' }))
    await waitFor(() => expect(fetchImage).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByRole('textbox', { name: 'Markdown 内容' }), { target: { value: '# 新内容' } })
    finishFetch(new Response(new TextEncoder().encode('image'), { status: 200, headers: { 'content-type': 'image/png' } }))

    expect(await screen.findByText('文章已发生变化，请重新复制')).toBeVisible()
    expect(write).not.toHaveBeenCalled()
  })

  it('discards a prepared clipboard payload when preview rendering changes during image conversion', async () => {
    const user = userEvent.setup()
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write } })
    class TestClipboardItem {
      constructor(public readonly data: Record<string, Blob>) {}
    }
    vi.stubGlobal('ClipboardItem', TestClipboardItem)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/slow-preview-image')
    let finishFetch: (response: Response) => void = () => undefined
    const fetchImage = vi.fn(() => new Promise<Response>((resolve) => { finishFetch = resolve }))
    vi.stubGlobal('fetch', fetchImage)
    const articleRepository = createMemoryArticleRepository({
      articles: [{ id: 'preview-race', title: '预览竞态', date: '刚刚', content: '# 内容\n\n![图片](asset://image-1)' }],
      selectedId: 'preview-race',
    })
    const assetRepository = createMemoryAssetRepository([{
      id: 'image-1', name: '图片.png', mimeType: 'image/png', size: 5, createdAt: '2026-09-17T00:00:00.000Z', source: 'file', blob: new Blob(['image'], { type: 'image/png' }),
    }])
    render(<App articleRepository={articleRepository} assetRepository={assetRepository} />)

    await waitFor(() => expect(document.querySelector('article img')).toHaveAttribute('src', 'blob:http://localhost/slow-preview-image'))
    await user.click(screen.getByRole('button', { name: '复制到公众号' }))
    await waitFor(() => expect(fetchImage).toHaveBeenCalledOnce())
    await user.click(screen.getByRole('button', { name: '手机预览' }))
    finishFetch(new Response(new TextEncoder().encode('image'), { status: 200, headers: { 'content-type': 'image/png' } }))

    expect(await screen.findByText('文章已发生变化，请重新复制')).toBeVisible()
    expect(write).not.toHaveBeenCalled()
  })

  it('connects article selection and editor changes to application state', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^AI 工具推荐清单，/ }))
    expect(screen.getByRole('button', { name: /^AI 工具推荐清单，/ })).toHaveAttribute('aria-current', 'page')

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

  it('keeps every typography category in the layout settings menu', () => {
    render(<App />)
    const settings = within(screen.getByRole('region', { name: /^排版设置$/ }))

    for (const label of ['全局设置', '标题样式', '正文样式', '引用样式', '代码样式', '列表样式', '表格样式', '图片样式', '分割线样式', '链接样式', '其他样式']) {
      expect(settings.getByRole('button', { name: label })).toBeVisible()
    }
  })

  it('keeps insertable content blocks in the separate components menu', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: '组件' }))

    for (const label of ['信息卡片', '步骤列表', '重点提示', '图片说明']) {
      expect(screen.getByText(label)).toBeVisible()
    }
    expect(screen.queryByRole('button', { name: '引用样式' })).not.toBeInTheDocument()
  })

  it('filters the component library into compact categories', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: '组件' }))
    const panel = within(screen.getByRole('region', { name: /^排版设置$/ }))

    expect(panel.getByRole('button', { name: '常用' })).toHaveAttribute('aria-pressed', 'true')
    expect(panel.getAllByRole('button', { name: /^插入 / })).toHaveLength(4)
    await user.click(panel.getByRole('button', { name: '结构' }))
    expect(panel.getByRole('button', { name: '插入 分节标题' })).toBeVisible()
    expect(panel.getByRole('button', { name: '插入 代码示例' })).toBeVisible()
    expect(panel.queryByRole('button', { name: '插入 信息卡片' })).not.toBeInTheDocument()
  })

  it('paginates custom components four at a time without growing the panel', async () => {
    const user = userEvent.setup()
    const repository = createMemoryArticleRepository({
      articles: [{ id: 'components', title: '组件文章', date: '刚刚', content: '# 正文' }],
      selectedId: 'components',
      components: Array.from({ length: 5 }, (_, index) => ({
        id: `custom-${index + 1}`,
        name: `自定义组件${index + 1}`,
        description: '自定义内容块',
        content: `内容${index + 1}`,
        builtIn: false,
      })),
    })
    render(<App articleRepository={repository} saveDelay={0} />)
    await screen.findByRole('textbox', { name: 'Markdown 内容' })
    await user.click(screen.getByRole('tab', { name: '组件' }))
    const panel = within(screen.getByRole('region', { name: /^排版设置$/ }))
    await user.click(panel.getByRole('button', { name: '我的' }))

    expect(panel.getAllByRole('button', { name: /^插入 自定义组件/ })).toHaveLength(4)
    expect(panel.getByText('1 / 2')).toBeVisible()
    await user.click(panel.getByRole('button', { name: '下一页' }))
    expect(panel.getByRole('button', { name: '插入 自定义组件5' })).toBeVisible()
    expect(panel.queryByRole('button', { name: '插入 自定义组件1' })).not.toBeInTheDocument()
    expect(panel.getByText('2 / 2')).toBeVisible()
  })

  it('inserts a content component at the current editor selection', async () => {
    const user = userEvent.setup()
    render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' }) as HTMLTextAreaElement
    const selectedText = 'Ollama 是一个开源的本地大模型运行工具'
    const start = editor.value.indexOf(selectedText)
    editor.setSelectionRange(start, start + selectedText.length)
    fireEvent.select(editor)

    await user.click(screen.getByRole('tab', { name: '组件' }))
    await user.click(screen.getByRole('button', { name: '插入 信息卡片' }))

    expect(editor.value).toContain('> 💡 **信息**')
    expect(editor.value).not.toContain(selectedText)
  })

  it('saves selected Markdown as a reusable custom component and manages it', async () => {
    const user = userEvent.setup()
    render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' }) as HTMLTextAreaElement
    const selectedText = 'Ollama 是一个开源的本地大模型运行工具'
    const start = editor.value.indexOf(selectedText)
    editor.setSelectionRange(start, start + selectedText.length)
    fireEvent.select(editor)

    await user.click(screen.getByRole('tab', { name: '组件' }))
    await user.click(screen.getByRole('button', { name: '将选中内容保存为组件' }))
    let dialog = within(screen.getByRole('dialog', { name: '保存为组件' }))
    await user.type(dialog.getByRole('textbox', { name: '组件名称' }), '固定开场')
    await user.click(dialog.getByRole('button', { name: '保存组件' }))
    expect(screen.getByText('固定开场')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '管理 固定开场' }))
    await user.click(screen.getByRole('menuitem', { name: '删除组件' }))
    dialog = within(screen.getByRole('dialog', { name: '删除组件' }))
    await user.click(dialog.getByRole('button', { name: '确认删除' }))
    expect(screen.queryByText('固定开场')).not.toBeInTheDocument()
  })

  it('edits the remaining inline typography from other styles', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: '其他样式' }))
    fireEvent.change(screen.getByLabelText('粗体颜色'), { target: { value: '#ecbbab' } })

    expect(container.querySelector('article')).toHaveStyle({ '--article-strong-color': '#ecbbab' })
  })

  it('edits global article settings from the dedicated page settings menu', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(screen.getByRole('tab', { name: '页面设置' }))

    fireEvent.change(screen.getByRole('spinbutton', { name: '字号' }), { target: { value: '18' } })

    expect(container.querySelector('article')).toHaveStyle({ '--article-font-size': '18px' })
  })

  it('switches the current article style from the toolbar', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: '风格' }))
    await user.click(screen.getByRole('menuitem', { name: '暖色 · 阅读' }))

    expect(container.querySelector('article')).toHaveStyle({
      '--article-background': '#fffaf2',
      '--article-accent': '#9c4f3d',
    })
    expect(screen.getByText('暖色 · 阅读')).toBeVisible()
  })

  it('does not list the removed basic and advanced styles', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '风格' }))

    expect(screen.queryByRole('menuitem', { name: '深海蓝' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: '深海终端' })).not.toBeInTheDocument()
  })

  it('edits detailed heading styles with an immediate preview', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: '标题样式' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'H1 字号' }), { target: { value: '40' } })

    expect(container.querySelector('article')).toHaveStyle({ '--article-h1-size': '40px' })
  })

  it('saves changes to a built-in preset as a named style and applies it', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(screen.getByRole('button', { name: '标题样式' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'H1 字号' }), { target: { value: '40' } })

    expect(container.querySelector('article')).toHaveStyle({ '--article-h1-size': '40px' })
    await user.click(screen.getByRole('button', { name: '另存并应用' }))
    const name = screen.getByRole('textbox', { name: '风格名称' })
    await user.clear(name)
    await user.type(name, '我的长文风格')
    await user.click(screen.getByRole('button', { name: '保存并应用' }))

    expect(await screen.findByText('已保存并应用“我的长文风格”')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '风格' }))
    expect(screen.getByRole('menuitem', { name: /我的长文风格/ })).toBeVisible()
  })

  it('saves later changes to a custom style without asking for another name', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(screen.getByRole('button', { name: '标题样式' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'H1 字号' }), { target: { value: '40' } })
    await user.click(screen.getByRole('button', { name: '另存并应用' }))
    const name = screen.getByRole('textbox', { name: '风格名称' })
    await user.clear(name)
    await user.type(name, '可编辑风格')
    await user.click(screen.getByRole('button', { name: '保存并应用' }))

    fireEvent.change(screen.getByRole('spinbutton', { name: 'H1 字号' }), { target: { value: '42' } })
    await user.click(screen.getByRole('button', { name: '保存并应用' }))

    expect(screen.queryByRole('dialog', { name: '保存为新风格' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '未保存的风格修改' })).not.toBeInTheDocument()
    expect(container.querySelector('article')).toHaveStyle({ '--article-h1-size': '42px' })
  })

  it('discards an unsaved style draft and restores the applied style', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(screen.getByRole('button', { name: '标题样式' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'H1 字号' }), { target: { value: '40' } })

    await user.click(screen.getByRole('button', { name: '撤销' }))

    expect(container.querySelector('article')).toHaveStyle({ '--article-h1-size': '31px' })
    expect(screen.queryByRole('region', { name: '未保存的风格修改' })).not.toBeInTheDocument()
  })

  it('opens the style library from the current style card and applies a preset', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: '更换风格' }))
    const library = within(screen.getByRole('region', { name: '风格库' }))
    expect(library.getByText('默认 · 简洁')).toBeVisible()
    expect(library.getByText('教程 · 清晰')).toBeVisible()
    expect(library.getByText('新闻 · 严谨')).toBeVisible()
    expect(library.getByText('资讯 · 清爽')).toBeVisible()
    expect(library.getByText('产品 · 醒目')).toBeVisible()
    expect(library.getByText('墨色 · 长文')).toBeVisible()
    expect(library.getByText('已应用')).toBeVisible()

    await user.click(library.getByRole('button', { name: '应用 教程 · 清晰' }))

    expect(container.querySelector('article')).toHaveAttribute('data-template-layout', 'tutorial')
    expect(await screen.findByText('已应用“教程 · 清晰”')).toBeVisible()
  })

  it('opens the same style library from the toolbar style menu', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '风格' }))
    await user.click(screen.getByRole('menuitem', { name: '管理风格' }))

    expect(screen.getByRole('region', { name: '风格库' })).toBeVisible()
  })

  it('protects an unsaved style draft before applying another toolbar style', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(screen.getByRole('button', { name: '标题样式' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'H1 字号' }), { target: { value: '40' } })

    await user.click(screen.getByRole('button', { name: '风格' }))
    await user.click(screen.getByRole('menuitem', { name: '暖色 · 阅读' }))

    expect(screen.getByRole('dialog', { name: '未保存的风格修改' })).toBeVisible()
    expect(container.querySelector('article')).toHaveStyle({ '--article-h1-size': '40px' })
    await user.click(screen.getByRole('button', { name: '放弃并继续' }))
    expect(container.querySelector('article')).toHaveStyle({ '--article-background': '#fffaf2' })
  })

  it('keeps an unsaved draft when the current toolbar style is selected again', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(screen.getByRole('button', { name: '标题样式' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'H1 字号' }), { target: { value: '40' } })

    await user.click(screen.getByRole('button', { name: '风格' }))
    await user.click(screen.getByRole('menuitem', { name: /默认 · 简洁/ }))

    expect(screen.getByRole('region', { name: '未保存的风格修改' })).toBeVisible()
    expect(container.querySelector('article')).toHaveStyle({ '--article-h1-size': '40px' })
  })

  it('can save an unsaved draft before continuing to another style', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '标题样式' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'H1 字号' }), { target: { value: '40' } })
    await user.click(screen.getByRole('button', { name: '风格' }))
    await user.click(screen.getByRole('menuitem', { name: '暖色 · 阅读' }))

    const dialog = within(screen.getByRole('dialog', { name: '未保存的风格修改' }))
    const name = dialog.getByRole('textbox', { name: '风格名称' })
    await user.clear(name)
    await user.type(name, '切换前保存')
    await user.click(dialog.getByRole('button', { name: '保存并继续' }))

    await user.click(screen.getByRole('button', { name: '风格' }))
    expect(screen.getByRole('menuitem', { name: /切换前保存/ })).toBeVisible()
  })

  it('protects an unsaved style draft before switching articles', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '标题样式' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'H1 字号' }), { target: { value: '40' } })

    await user.click(screen.getByRole('button', { name: /^AI 工具推荐清单，/ }))

    expect(screen.getByRole('dialog', { name: '未保存的风格修改' })).toBeVisible()
    expect(screen.getByRole('button', { name: /^在本地运行大语言模型.*，/, hidden: true })).toHaveAttribute('aria-current', 'page')
    await user.click(screen.getByRole('button', { name: '放弃并继续' }))
    expect(screen.getByRole('button', { name: /^AI 工具推荐清单，/ })).toHaveAttribute('aria-current', 'page')
  })

  it('forgets a canceled style switch before guarding a later article switch', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(screen.getByRole('button', { name: '标题样式' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'H1 字号' }), { target: { value: '40' } })
    await user.click(screen.getByRole('button', { name: '风格' }))
    await user.click(screen.getByRole('menuitem', { name: '暖色 · 阅读' }))
    await user.click(screen.getByRole('button', { name: '取消' }))

    await user.click(screen.getByRole('button', { name: /^AI 工具推荐清单，/ }))
    await user.click(screen.getByRole('button', { name: '放弃并继续' }))

    expect(screen.getByRole('button', { name: /^AI 工具推荐清单，/ })).toHaveAttribute('aria-current', 'page')
    expect(container.querySelector('article')).toHaveStyle({ '--article-background': '#ffffff' })
    expect(screen.queryByText('已应用“暖色 · 阅读”')).not.toBeInTheDocument()
  })

  it('offers the same save flow for changes made in page settings', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: '页面设置' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: '字号' }), { target: { value: '18' } })

    expect(screen.getByRole('region', { name: '未保存的风格修改' })).toBeVisible()
    expect(screen.getByRole('button', { name: '另存并应用' })).toBeVisible()
  })

  it('renames, resets, and deletes a custom style from the style library without changing the article content', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' }) as HTMLTextAreaElement
    const originalContent = editor.value
    await user.click(screen.getByRole('button', { name: '标题样式' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'H1 字号' }), { target: { value: '42' } })
    await user.click(screen.getByRole('button', { name: '另存并应用' }))
    const saveDialog = within(screen.getByRole('dialog', { name: '保存为新风格' }))
    await user.clear(saveDialog.getByRole('textbox', { name: '风格名称' }))
    await user.type(saveDialog.getByRole('textbox', { name: '风格名称' }), '我的长文风格')
    await user.click(saveDialog.getByRole('button', { name: '保存并应用' }))

    await user.click(screen.getByRole('button', { name: '风格' }))
    await user.click(screen.getByRole('menuitem', { name: '管理风格' }))
    await user.click(screen.getByRole('button', { name: '管理 我的长文风格' }))
    await user.click(screen.getByRole('menuitem', { name: '重命名风格' }))
    const renameDialog = within(screen.getByRole('dialog', { name: '重命名风格' }))
    await user.clear(renameDialog.getByRole('textbox', { name: '风格名称' }))
    await user.type(renameDialog.getByRole('textbox', { name: '风格名称' }), '长文终稿')
    await user.click(renameDialog.getByRole('button', { name: '保存名称' }))

    expect(screen.getByText('长文终稿')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '管理 长文终稿' }))
    await user.click(screen.getByRole('menuitem', { name: '恢复基础风格' }))
    expect(container.querySelector('article')).toHaveStyle({ '--article-h1-size': '31px' })

    await user.click(screen.getByRole('button', { name: '管理 长文终稿' }))
    await user.click(screen.getByRole('menuitem', { name: '删除风格' }))
    const deleteDialog = within(screen.getByRole('dialog', { name: '删除风格' }))
    await user.click(deleteDialog.getByRole('button', { name: '确认删除' }))

    expect(screen.queryByText('长文终稿')).not.toBeInTheDocument()
    expect(editor).toHaveValue(originalContent)
  })

  it('resets a custom style to the built-in preset it was based on', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(screen.getByRole('button', { name: '风格' }))
    await user.click(screen.getByRole('menuitem', { name: '暖色 · 阅读' }))
    await user.click(screen.getByRole('button', { name: '标题样式' }))
    fireEvent.change(screen.getByLabelText('H1 颜色'), { target: { value: '#000000' } })
    await user.click(screen.getByRole('button', { name: '另存并应用' }))
    const saveDialog = within(screen.getByRole('dialog', { name: '保存为新风格' }))
    await user.clear(saveDialog.getByRole('textbox', { name: '风格名称' }))
    await user.type(saveDialog.getByRole('textbox', { name: '风格名称' }), '暖色自定义')
    await user.click(saveDialog.getByRole('button', { name: '保存并应用' }))

    await user.click(screen.getByRole('button', { name: '风格' }))
    await user.click(screen.getByRole('menuitem', { name: '管理风格' }))
    await user.click(screen.getByRole('button', { name: '管理 暖色自定义' }))
    await user.click(screen.getByRole('menuitem', { name: '恢复基础风格' }))

    expect(container.querySelector('article')).toHaveStyle({ '--article-h1-color': '#7f3f32' })
  })

  it('restores the selected style and custom style changes in a later session', async () => {
    const user = userEvent.setup()
    const repository = createMemoryArticleRepository()
    const firstSession = render(<App articleRepository={repository} saveDelay={0} />)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/^已保存/))
    await user.click(screen.getByRole('button', { name: '标题样式' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'H1 字号' }), { target: { value: '38' } })
    await user.click(screen.getByRole('button', { name: '另存并应用' }))
    const saveDialog = within(screen.getByRole('dialog', { name: '保存为新风格' }))
    await user.clear(saveDialog.getByRole('textbox', { name: '风格名称' }))
    await user.type(saveDialog.getByRole('textbox', { name: '风格名称' }), '持久化风格')
    await user.click(saveDialog.getByRole('button', { name: '保存并应用' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/^已保存/))

    firstSession.unmount()
    const { container } = render(<App articleRepository={repository} saveDelay={0} />)

    await waitFor(() => expect(container.querySelector('article')).toHaveStyle({ '--article-h1-size': '38px' }))
    await user.click(screen.getByRole('button', { name: '风格' }))
    expect(screen.getByRole('menuitem', { name: '✓ 持久化风格' })).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.getByText('持久化风格')).toBeVisible()
    expect(container.querySelector('article')).toHaveStyle({ '--article-h1-size': '38px' })
  })

  it('imports a public account article and applies its extracted style only after confirmation', async () => {
    const user = userEvent.setup()
    const extraction: ExtractedWechatArticle = {
      sourceUrl: 'https://mp.weixin.qq.com/s/example',
      title: '导入的公众号文章',
      author: '示例作者',
      html: '<p>公众号正文</p>',
      markdown: '公众号正文',
      tokens: [{ path: 'global.accentColor', label: '强调色', value: '#336699', displayValue: '#336699', swatch: '#336699' }],
      components: [],
    }
    const { container } = render(<App wechatExtractor={async () => extraction} />)

    await user.click(screen.getByRole('button', { name: '提取公众号' }))
    await user.type(screen.getByRole('textbox', { name: '公众号文章链接' }), extraction.sourceUrl)
    await user.click(screen.getByRole('button', { name: '开始提取' }))
    await user.click(await screen.findByRole('button', { name: '保存文章' }))
    await user.click(await screen.findByRole('button', { name: '应用整套风格' }))

    expect(screen.getByRole('button', { name: '公众号导入 1' })).toBeVisible()
    expect(screen.getByRole('button', { name: /^导入的公众号文章，/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('textbox', { name: 'Markdown 内容' })).toHaveValue('# 导入的公众号文章\n\n公众号正文')
    expect(container.querySelector('article')).toHaveStyle({ '--article-accent': '#336699' })
  })

  it('writes extracted public account images to the configured desktop directory', async () => {
    const user = userEvent.setup()
    const saveArticle = vi.fn().mockResolvedValue({ directory: 'D:\\公众号文章\\带图片文章\\images', saved: 1 })
    const extraction: ExtractedWechatArticle = {
      sourceUrl: 'https://mp.weixin.qq.com/s/image-example',
      title: '带图片文章',
      author: '示例作者',
      html: '<p>正文</p>',
      markdown: '![配图](https://mmbiz.qpic.cn/example.png)',
      tokens: [],
      components: [],
    }
    const services = {
      ...runtimeWithFiles(unusedFileService()),
      extractWechatArticle: async () => extraction,
      imageFetcher: async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } }),
      imageArchive: {
        getDirectory: async () => 'D:\\公众号文章',
        chooseDirectory: async () => null,
        resetDirectory: async () => 'E:\\Apps\\WeChat MD',
        saveArticle,
        openDirectory: async () => undefined,
      },
    } as RuntimeServices

    render(<App services={services} />)
    await user.click(await screen.findByRole('button', { name: '提取公众号' }))
    await user.type(screen.getByRole('textbox', { name: '公众号文章链接' }), extraction.sourceUrl)
    await user.click(screen.getByRole('button', { name: '开始提取' }))
    await user.click(await screen.findByRole('button', { name: '保存文章' }))

    await waitFor(() => expect(saveArticle).toHaveBeenCalledOnce())
    expect(saveArticle).toHaveBeenCalledWith('带图片文章', [expect.objectContaining({ name: expect.any(String), mimeType: 'image/png' })])
    expect(await screen.findByText(/1 张图片已保存到/)).toBeVisible()
  })

  it('lets the user change the public account article save policy from page settings', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: '页面设置' }))
    const policy = screen.getByRole('combobox', { name: '公众号文章保存方式' })
    expect(policy).toHaveValue('ask')
    await user.selectOptions(policy, 'never')
    expect(policy).toHaveValue('never')
  })

  it('stores a pasted image locally and inserts a stable resource reference', async () => {
    const assetRepository = createMemoryAssetRepository()
    render(<App assetRepository={assetRepository} />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' })
    const image = new File(['image'], '截图.png', { type: 'image/png' })

    fireEvent.paste(editor, { clipboardData: { files: [image] } })

    await waitFor(() => expect((editor as HTMLTextAreaElement).value).toContain('![截图](asset://'))
    await expect(assetRepository.list()).resolves.toEqual([expect.objectContaining({ name: '截图.png', source: 'paste' })])
  })

  it('opens the image resource menu and renders stored image thumbnails', async () => {
    const user = userEvent.setup()
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/stored-thumb')
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const assetRepository = createMemoryAssetRepository([{
      id: 'stored-image', name: '旧封面.png', mimeType: 'image/png', size: 5, createdAt: '2026-09-12T00:00:00.000Z', source: 'file', unused: true, blob: new Blob(['image'], { type: 'image/png' }),
    }])
    render(<App assetRepository={assetRepository} />)

    await user.click(screen.getByRole('button', { name: '更多操作' }))
    await user.click(screen.getByRole('menuitem', { name: '图片资源' }))

    const dialog = await screen.findByRole('dialog', { name: '图片资源' })
    expect(dialog).toBeVisible()
    await waitFor(() => expect(dialog.querySelector('img')).toHaveAttribute('src', 'blob:http://localhost/stored-thumb'))
    createObjectUrl.mockRestore()
    revokeObjectUrl.mockRestore()
  })

  it('manually saves and safely restores an article version', async () => {
    const user = userEvent.setup()
    const articleRepository = createMemoryArticleRepository({
      articles: [{ id: 'versioned', title: '版本文章', date: '刚刚', content: '# 当前内容' }], selectedId: 'versioned',
    })
    const versionRepository = createMemoryVersionRepository()
    render(<App articleRepository={articleRepository} versionRepository={versionRepository} saveDelay={60_000} />)
    const editor = await screen.findByRole('textbox', { name: 'Markdown 内容' })

    await user.click(screen.getByRole('button', { name: '更多操作' }))
    await user.click(screen.getByRole('menuitem', { name: '版本历史' }))
    await user.click(screen.getByRole('button', { name: '保存当前版本' }))
    await waitFor(async () => expect(await versionRepository.list('versioned')).toHaveLength(1))
    await user.click(screen.getByRole('button', { name: '关闭' }))
    fireEvent.change(editor, { target: { value: '# 修改后的内容' } })

    await user.click(screen.getByRole('button', { name: '更多操作' }))
    await user.click(screen.getByRole('menuitem', { name: '版本历史' }))
    await user.click(screen.getByRole('button', { name: '恢复版本 版本文章' }))
    await user.click(screen.getByRole('button', { name: '确认恢复' }))

    expect(editor).toHaveValue('# 当前内容')
    await waitFor(async () => expect((await versionRepository.list('versioned')).some((version) => version.reason === 'restore' && version.content === '# 修改后的内容')).toBe(true))
  })
})
