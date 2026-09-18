import { createStoredImageAsset, fetchImageAsset, MAX_IMAGE_BYTES } from './imageAssets'

describe('image asset imports', () => {
  it('creates a local resource from a supported image file', () => {
    const file = new File(['image'], '封面.png', { type: 'image/png' })

    const asset = createStoredImageAsset(file, 'paste', { id: 'image-1', now: '2026-09-12T00:00:00.000Z' })

    expect(asset).toMatchObject({ id: 'image-1', name: '封面.png', mimeType: 'image/png', size: 5, source: 'paste' })
    expect(asset.blob).toBe(file)
  })

  it('rejects non-image files and images over 20 MB', () => {
    expect(() => createStoredImageAsset(new File(['text'], 'note.txt', { type: 'text/plain' }), 'file')).toThrow('请选择图片文件')
    expect(() => createStoredImageAsset(new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'huge.png', { type: 'image/png' }), 'file')).toThrow('不能超过 20 MB')
  })

  it('downloads a network image and preserves its source url', async () => {
    const fetcher = async () => new Response(new TextEncoder().encode('remote'), { headers: { 'content-type': 'image/webp' } })

    const asset = await fetchImageAsset('https://img.example.com/cover.webp', 'remote', { fetcher, id: 'remote-1', now: '2026-09-12T00:00:00.000Z' })

    expect(asset).toMatchObject({ id: 'remote-1', name: 'cover.webp', mimeType: 'image/webp', source: 'remote', sourceUrl: 'https://img.example.com/cover.webp' })
  })

  it('rejects unsafe network protocols before requesting them', async () => {
    const fetcher = vi.fn()

    await expect(fetchImageAsset('file:///secret.png', 'remote', { fetcher })).rejects.toThrow('仅支持 http 或 https 图片链接')
    expect(fetcher).not.toHaveBeenCalled()
  })
})
