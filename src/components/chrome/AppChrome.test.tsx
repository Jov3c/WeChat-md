import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TitleBar } from './TitleBar'
import { Toolbar } from './Toolbar'

describe('application chrome', () => {
  it('shows the brand mark without fake browser window controls', () => {
    render(<TitleBar />)

    expect(screen.getByRole('img', { name: 'WeChat MD 品牌图标' })).toBeVisible()
    expect(screen.getByText('WeChat MD Editor')).toBeVisible()
    expect(screen.getByText('专注于更好的公众号写作体验')).toBeVisible()
    expect(screen.queryByRole('button', { name: '最小化窗口' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '最大化窗口' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '关闭窗口' })).not.toBeInTheDocument()
  })

  it('connects primary toolbar actions to application callbacks', async () => {
    const onNewArticle = vi.fn()
    const onImport = vi.fn()
    const onExtract = vi.fn()
    const onCopy = vi.fn()
    const user = userEvent.setup()

    render(
      <Toolbar
        onNewArticle={onNewArticle}
        onImport={onImport}
        onExtract={onExtract}
        onCopy={onCopy}
      />,
    )

    await user.click(screen.getByRole('button', { name: '新建文章' }))
    await user.click(screen.getByRole('button', { name: '导入 MD' }))
    await user.click(screen.getByRole('button', { name: '提取公众号' }))
    await user.click(screen.getByRole('button', { name: '复制到公众号' }))

    expect(onNewArticle).toHaveBeenCalledOnce()
    expect(onImport).toHaveBeenCalledOnce()
    expect(onExtract).toHaveBeenCalledOnce()
    expect(onCopy).toHaveBeenCalledOnce()
  })

  it('separates article layouts from content templates', async () => {
    const onLayoutSelect = vi.fn()
    const onContentTemplateSelect = vi.fn()
    const user = userEvent.setup()

    render(
      <Toolbar
        onNewArticle={() => undefined}
        onImport={() => undefined}
        onExtract={() => undefined}
        onCopy={() => undefined}
        onLayoutSelect={onLayoutSelect}
        onContentTemplateSelect={onContentTemplateSelect}
      />,
    )

    await user.click(screen.getByRole('button', { name: '版式' }))
    await user.click(screen.getByRole('menuitem', { name: '教程文章' }))
    expect(onLayoutSelect).toHaveBeenCalledWith('tutorial')

    await user.click(screen.getByRole('button', { name: '模板' }))
    await user.click(screen.getByRole('menuitem', { name: '教程指南' }))
    expect(onContentTemplateSelect).toHaveBeenCalledWith('tutorial-guide')
  })
})
