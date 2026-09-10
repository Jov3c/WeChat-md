import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'

describe('WeChat MD application shell', () => {
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
