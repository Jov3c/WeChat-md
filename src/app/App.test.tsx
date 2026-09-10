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
  })
})
