import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { builtInContentTemplates } from '../../features/templates/templatePresets'
import { NewArticleDialog } from './NewArticleDialog'

describe('NewArticleDialog', () => {
  it('creates either a blank article or an article from a selected template', async () => {
    const user = userEvent.setup()
    const onBlank = vi.fn()
    const onTemplateSelect = vi.fn()
    const onOpenChange = vi.fn()

    const { rerender } = render(
      <NewArticleDialog
        open
        onOpenChange={onOpenChange}
        templates={builtInContentTemplates}
        onBlank={onBlank}
        onTemplateSelect={onTemplateSelect}
      />,
    )

    await user.click(screen.getByRole('button', { name: '新建空白文章' }))
    expect(onBlank).toHaveBeenCalledOnce()
    expect(onOpenChange).toHaveBeenCalledWith(false)

    rerender(
      <NewArticleDialog
        open
        onOpenChange={onOpenChange}
        templates={builtInContentTemplates}
        onBlank={onBlank}
        onTemplateSelect={onTemplateSelect}
      />,
    )
    await user.click(screen.getByRole('button', { name: '使用 教程指南' }))
    expect(onTemplateSelect).toHaveBeenCalledWith('tutorial-guide')
  })
})
