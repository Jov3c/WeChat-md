import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorPanel } from './EditorPanel'

describe('EditorPanel image input', () => {
  it('sends pasted image files to the image importer without inserting binary text', () => {
    const onImageFiles = vi.fn()
    render(<EditorPanel value="正文" onChange={vi.fn()} tab="edit" onTabChange={vi.fn()} onImageFiles={onImageFiles} />)
    const file = new File(['png'], '截图.png', { type: 'image/png' })

    fireEvent.paste(screen.getByRole('textbox', { name: 'Markdown 内容' }), { clipboardData: { files: [file] } })

    expect(onImageFiles).toHaveBeenCalledWith([file], 'paste')
  })

  it('offers a visible image button that opens a file picker', async () => {
    const user = userEvent.setup()
    const onImageFiles = vi.fn()
    render(<EditorPanel value="" onChange={vi.fn()} tab="edit" onTabChange={vi.fn()} onImageFiles={onImageFiles} />)

    await user.upload(screen.getByLabelText('选择要插入的图片'), new File(['png'], '封面.png', { type: 'image/png' }))

    expect(onImageFiles).toHaveBeenCalledWith([expect.objectContaining({ name: '封面.png' })], 'file')
  })

  it('accepts dropped image files in the editor', () => {
    const onImageFiles = vi.fn()
    render(<EditorPanel value="" onChange={vi.fn()} tab="edit" onTabChange={vi.fn()} onImageFiles={onImageFiles} />)
    const file = new File(['png'], '拖入.png', { type: 'image/png' })

    fireEvent.drop(screen.getByRole('textbox', { name: 'Markdown 内容' }), { dataTransfer: { files: [file] } })

    expect(onImageFiles).toHaveBeenCalledWith([file], 'drop')
  })
})
