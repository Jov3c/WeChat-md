import { createDesktopImageArchive } from './desktopImageArchive'

describe('desktop image archive', () => {
  it('defaults to the executable directory and persists a chosen directory', async () => {
    const values = new Map<string, string>()
    const storage: Storage = {
      get length() { return values.size },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => [...values.keys()][index] ?? null,
      removeItem: (key) => { values.delete(key) },
      setItem: (key, value) => { values.set(key, value) },
    }
    const invoke = vi.fn(async (command: string) => command === 'default_image_save_directory' ? 'E:\\Apps\\WeChat MD' : undefined)
    const archive = createDesktopImageArchive({
      invoke,
      storage,
      selectDirectory: async () => 'D:\\公众号文章',
    })

    await expect(archive.getDirectory()).resolves.toBe('E:\\Apps\\WeChat MD')
    await expect(archive.chooseDirectory()).resolves.toBe('D:\\公众号文章')
    await expect(archive.getDirectory()).resolves.toBe('D:\\公众号文章')
    await expect(archive.resetDirectory()).resolves.toBe('E:\\Apps\\WeChat MD')
  })

  it('sends exact downloaded bytes to the native image writer', async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === 'save_article_images') return { directory: 'D:\\文章\\标题\\images', saved: 1 }
      return 'D:\\文章'
    })
    const archive = createDesktopImageArchive({
      invoke,
      storage: localStorage,
      selectDirectory: async () => null,
    })

    await expect(archive.saveArticle('标题', [{ name: '封面.png', mimeType: 'image/png', bytes: new Uint8Array([7, 8, 9]) }])).resolves.toEqual({
      directory: 'D:\\文章\\标题\\images', saved: 1,
    })
    expect(invoke).toHaveBeenCalledWith('save_article_images', {
      baseDirectory: 'D:\\文章',
      articleTitle: '标题',
      images: [{ name: '封面.png', mimeType: 'image/png', bytes: [7, 8, 9] }],
    })
  })
})
