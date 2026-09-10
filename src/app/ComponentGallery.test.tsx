import { render, screen } from '@testing-library/react'
import { ComponentGallery } from './ComponentGallery'

describe('ComponentGallery', () => {
  it('presents reusable controls and their important states for review', () => {
    render(<ComponentGallery />)

    expect(screen.getByRole('heading', { name: 'UI 组件库' })).toBeVisible()
    expect(screen.getByRole('button', { name: '主要按钮' })).toBeVisible()
    expect(screen.getByRole('button', { name: '禁用按钮' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: '自动保存' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '保存正文' })).toBeChecked()
  })
})
