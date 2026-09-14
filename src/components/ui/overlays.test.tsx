import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog, DropdownMenu, ScrollArea, Toast } from '.'

describe('overlay and feedback controls', () => {
  it('opens a menu and runs the selected item action', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(
      <DropdownMenu
        trigger={<button>模板</button>}
        items={[{ id: 'blank', label: '空白文章', onSelect }]}
      />,
    )

    await user.click(screen.getByRole('button', { name: '模板' }))
    expect(screen.getByRole('menu')).toHaveStyle({ maxHeight: 'calc(100vh - 24px)', overflowY: 'auto' })
    const item = screen.getByRole('menuitem', { name: '空白文章' })
    expect(item).toBeVisible()
    await user.click(item)
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('labels an open dialog and exposes its close action', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(
      <Dialog open onOpenChange={onOpenChange} title="预览设置">
        设置内容
      </Dialog>,
    )

    expect(screen.getByRole('dialog', { name: '预览设置' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: '关闭' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('announces toast feedback and renders scrollable content', () => {
    render(
      <>
        <Toast open message="已复制到剪贴板" onOpenChange={vi.fn()} />
        <ScrollArea><p>文章内容</p></ScrollArea>
      </>,
    )

    expect(screen.getByText('已复制到剪贴板')).toBeVisible()
    expect(screen.getByText('文章内容')).toBeVisible()
  })
})
