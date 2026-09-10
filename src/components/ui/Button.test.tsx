import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('exposes the selected visual variant while preserving button behavior', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()

    render(
      <Button variant="primary" onClick={onClick}>
        新建文章
      </Button>,
    )

    const button = screen.getByRole('button', { name: '新建文章' })
    expect(button).toHaveAttribute('data-variant', 'primary')

    await user.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not invoke the action when disabled', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()

    render(
      <Button disabled onClick={onClick}>
        复制到公众号
      </Button>,
    )

    await user.click(screen.getByRole('button', { name: '复制到公众号' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})
