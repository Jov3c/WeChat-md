import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Search } from 'lucide-react'
import { Card, Checkbox, IconButton, Input, Slider, Switch, Tabs } from '.'

describe('core controls', () => {
  it('switches a controlled tab through its public callback', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()

    render(
      <Tabs
        ariaLabel="编辑区域区域"
        items={[
          { value: 'layout', label: '排版设置' },
          { value: 'components', label: '组件' },
        ]}
        value="layout"
        onValueChange={onValueChange}
      />,
    )

    expect(screen.getByRole('tab', { name: '排版设置' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: '组件' }))
    expect(onValueChange).toHaveBeenCalledWith('components')
  })

  it('reports switch state changes with an accessible label', async () => {
    const onCheckedChange = vi.fn()
    const user = userEvent.setup()
    render(<Switch checked onCheckedChange={onCheckedChange} label="双栏同步" />)

    const control = screen.getByRole('switch', { name: '双栏同步' })
    expect(control).toBeChecked()
    await user.click(control)
    expect(onCheckedChange).toHaveBeenCalledWith(false)
  })

  it('exposes slider value and icon button name to assistive technology', () => {
    render(
      <>
        <Slider label="页面宽度" value={[720]} min={560} max={820} onValueChange={vi.fn()} />
        <IconButton label="搜索文章"><Search size={16} /></IconButton>
      </>,
    )

    expect(screen.getByRole('slider', { name: '页面宽度' })).toHaveAttribute('aria-valuenow', '720')
    expect(screen.getByRole('button', { name: '搜索文章' })).toBeVisible()
  })

  it('preserves native input and selected card semantics', () => {
    render(
      <>
        <Input aria-label="文章标题" disabled value="标题" readOnly />
        <Card selected>默认 · 简洁</Card>
      </>,
    )

    expect(screen.getByRole('textbox', { name: '文章标题' })).toBeDisabled()
    expect(screen.getByText('默认 · 简洁')).toHaveAttribute('data-selected', 'true')
  })

  it('reports checkbox changes using checkbox semantics', async () => {
    const onCheckedChange = vi.fn()
    const user = userEvent.setup()
    render(<Checkbox checked={false} onCheckedChange={onCheckedChange} label="记住我的选择" />)

    await user.click(screen.getByRole('checkbox', { name: '记住我的选择' }))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })
})
