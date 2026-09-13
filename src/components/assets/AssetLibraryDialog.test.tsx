import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssetLibraryDialog } from './AssetLibraryDialog'

describe('AssetLibraryDialog', () => {
  it('shows used and unused images and can insert an existing resource', async () => {
    const user = userEvent.setup()
    const onInsert = vi.fn()
    render(<AssetLibraryDialog open onOpenChange={vi.fn()} assets={[
      { id: 'used', name: '正文.png', mimeType: 'image/png', size: 1024, createdAt: '2026-09-12T00:00:00.000Z', source: 'file' },
      { id: 'unused', name: '旧图.png', mimeType: 'image/png', size: 2048, createdAt: '2026-09-11T00:00:00.000Z', source: 'file', unused: true },
    ]} assetUrls={{ used: 'blob:used', unused: 'blob:unused' }} currentArticleIds={['used']} onInsert={onInsert} onImportFiles={vi.fn()} onImportUrl={vi.fn()} onRemoveFromArticle={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText(/正文使用中/)).toBeVisible()
    expect(screen.getByText(/2 KB.*未使用/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: '插入 旧图.png' }))
    expect(onInsert).toHaveBeenCalledWith('unused')
  })

  it('submits a network image url from the resource menu', async () => {
    const user = userEvent.setup()
    const onImportUrl = vi.fn()
    render(<AssetLibraryDialog open onOpenChange={vi.fn()} assets={[]} assetUrls={{}} currentArticleIds={[]} onInsert={vi.fn()} onImportFiles={vi.fn()} onImportUrl={onImportUrl} onRemoveFromArticle={vi.fn()} onDelete={vi.fn()} />)

    await user.type(screen.getByRole('textbox', { name: '网络图片地址' }), 'https://img.example.com/a.png')
    await user.click(screen.getByRole('button', { name: '下载并插入' }))

    expect(onImportUrl).toHaveBeenCalledWith('https://img.example.com/a.png')
  })
})
