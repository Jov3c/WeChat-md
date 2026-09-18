import { render, screen } from '@testing-library/react'
import { builtInContentTemplates } from '../../features/templates/templatePresets'
import { TemplateLibraryDialog } from './TemplateLibraryDialog'

describe('TemplateLibraryDialog', () => {
  it('manages templates without providing a second template-application entry', () => {
    render(
      <TemplateLibraryDialog
        open
        onOpenChange={() => undefined}
        templates={builtInContentTemplates}
        onRename={() => undefined}
        onDelete={() => undefined}
      />,
    )

    expect(screen.getByRole('dialog', { name: '管理模板' })).toBeVisible()
    expect(screen.getByText('模板会在“新建文章”时供你选择。')).toBeVisible()
    expect(screen.queryByRole('button', { name: '使用 教程指南' })).not.toBeInTheDocument()
  })
})
