import { describe, expect, it } from 'vitest'
import { createBrowserFileService, createDesktopFileService } from './fileServices'

const markdownOptions = {
  title: '导入 Markdown',
  filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
}

describe('browser file service', () => {
  it('returns the chosen text content and filename', async () => {
    const service = createBrowserFileService({
      pickFile: async () => new File(['# 浏览器文章'], 'browser.md', { type: 'text/markdown' }),
      download: () => undefined,
    })

    await expect(service.openText(markdownOptions)).resolves.toEqual({
      name: 'browser.md',
      content: '# 浏览器文章',
    })
  })

  it('returns null when file selection is cancelled', async () => {
    const service = createBrowserFileService({
      pickFile: async () => null,
      download: () => undefined,
    })

    await expect(service.openBytes(markdownOptions)).resolves.toBeNull()
  })

  it('downloads the exact filename, MIME type and bytes', async () => {
    let downloaded: { blob: Blob; filename: string } | undefined
    const service = createBrowserFileService({
      pickFile: async () => null,
      download: (blob, filename) => { downloaded = { blob, filename } },
    })

    await expect(service.saveBytes({
      filename: 'workspace.wechatmd',
      mimeType: 'application/x-wechatmd',
      bytes: new Uint8Array([12, 34, 56]),
    })).resolves.toBe('saved')
    expect(downloaded?.filename).toBe('workspace.wechatmd')
    expect(downloaded?.blob.type).toBe('application/x-wechatmd')
    expect([...new Uint8Array(await downloaded!.blob.arrayBuffer())]).toEqual([12, 34, 56])
  })
})

describe('desktop file service', () => {
  it('opens selected text and binary files with their base filenames', async () => {
    const selectedPaths = ['C:\\Users\\Jov3\\article.md', 'C:\\Users\\Jov3\\workspace.wechatmd']
    const service = createDesktopFileService({
      open: async () => selectedPaths.shift() ?? null,
      save: async () => null,
      readTextFile: async () => '# 桌面文章',
      readFile: async () => new Uint8Array([7, 8, 9]),
      writeTextFile: async () => undefined,
      writeFile: async () => undefined,
    })

    await expect(service.openText(markdownOptions)).resolves.toEqual({ name: 'article.md', content: '# 桌面文章' })
    await expect(service.openBytes(markdownOptions)).resolves.toEqual({ name: 'workspace.wechatmd', bytes: new Uint8Array([7, 8, 9]) })
  })

  it('returns cancelled without writing when the save dialog is dismissed', async () => {
    let writes = 0
    const service = createDesktopFileService({
      open: async () => null,
      save: async () => null,
      readTextFile: async () => '',
      readFile: async () => new Uint8Array(),
      writeTextFile: async () => { writes += 1 },
      writeFile: async () => { writes += 1 },
    })

    await expect(service.saveText({ filename: 'article.md', mimeType: 'text/markdown', content: '# 内容' })).resolves.toBe('cancelled')
    expect(writes).toBe(0)
  })

  it('writes selected text and binary paths without changing their content', async () => {
    const writes: Array<{ path: string; content: string | number[] }> = []
    const paths = ['D:\\文章\\导出.md', 'D:\\文章\\备份.wechatmd']
    const service = createDesktopFileService({
      open: async () => null,
      save: async () => paths.shift() ?? null,
      readTextFile: async () => '',
      readFile: async () => new Uint8Array(),
      writeTextFile: async (path, content) => { writes.push({ path, content }) },
      writeFile: async (path, bytes) => { writes.push({ path, content: [...bytes] }) },
    })

    await expect(service.saveText({ filename: 'article.md', mimeType: 'text/markdown', content: '# 内容' })).resolves.toBe('saved')
    await expect(service.saveBytes({ filename: 'backup.wechatmd', mimeType: 'application/x-wechatmd', bytes: new Uint8Array([1, 3, 5]) })).resolves.toBe('saved')
    expect(writes).toEqual([
      { path: 'D:\\文章\\导出.md', content: '# 内容' },
      { path: 'D:\\文章\\备份.wechatmd', content: [1, 3, 5] },
    ])
  })

  it('preserves a useful filesystem error', async () => {
    const service = createDesktopFileService({
      open: async () => null,
      save: async () => 'D:\\article.md',
      readTextFile: async () => '',
      readFile: async () => new Uint8Array(),
      writeTextFile: async () => { throw new Error('磁盘已满') },
      writeFile: async () => undefined,
    })

    await expect(service.saveText({ filename: 'article.md', mimeType: 'text/markdown', content: 'content' })).rejects.toThrow('磁盘已满')
  })
})
