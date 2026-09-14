import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { EditorPanel, type EditorPanelHandle } from './EditorPanel'

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

describe('EditorPanel selection origin', () => {
  it('reports direct editor selections as user interactions', () => {
    const onSelectionChange = vi.fn()
    render(<EditorPanel value={'# 标题\n\n正文'} onChange={() => undefined} tab="edit" onTabChange={() => undefined} onSelectionChange={onSelectionChange} />)
    const editor = screen.getByRole('textbox', { name: 'Markdown 内容' }) as HTMLTextAreaElement

    editor.setSelectionRange(6, 8)
    fireEvent.select(editor)

    expect(onSelectionChange).toHaveBeenLastCalledWith(expect.objectContaining({ startLine: 3, text: '正文' }), 'user')
  })

  it('reports preview-driven focus as a programmatic selection', () => {
    const onSelectionChange = vi.fn()
    const ref = createRef<EditorPanelHandle>()
    render(<EditorPanel ref={ref} value={'# 标题\n\n正文'} onChange={() => undefined} tab="edit" onTabChange={() => undefined} onSelectionChange={onSelectionChange} />)

    act(() => ref.current?.focusLines(3, 3))

    expect(onSelectionChange).toHaveBeenLastCalledWith(expect.objectContaining({ startLine: 3, text: '正文' }), 'programmatic')
  })
})
