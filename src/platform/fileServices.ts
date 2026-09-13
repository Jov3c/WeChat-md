import type { TextExport } from '../features/export/articleExport'
import type { FileFilter, FileService, OpenFileOptions, SaveBytesOptions } from './contracts'

interface BrowserFileDependencies {
  pickFile(options: OpenFileOptions): Promise<File | null>
  download(blob: Blob, filename: string): void
}

interface DialogOptions {
  title?: string
  filters: FileFilter[]
}

interface SaveDialogOptions extends DialogOptions {
  defaultPath: string
}

export interface DesktopFileDependencies {
  open(options: DialogOptions): Promise<string | null>
  save(options: SaveDialogOptions): Promise<string | null>
  readTextFile(path: string): Promise<string>
  readFile(path: string): Promise<Uint8Array>
  writeTextFile(path: string, content: string): Promise<void>
  writeFile(path: string, bytes: Uint8Array): Promise<void>
}

function browserPickFile(options: OpenFileOptions) {
  return new Promise<File | null>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.setAttribute('aria-label', options.title ?? '选择文件')
    input.accept = options.filters.flatMap(({ extensions }) => extensions.map((extension) => `.${extension}`)).join(',')
    input.hidden = true
    const finish = (file: File | null) => {
      input.remove()
      resolve(file)
    }
    input.addEventListener('change', () => finish(input.files?.[0] ?? null), { once: true })
    input.addEventListener('cancel', () => finish(null), { once: true })
    document.body.append(input)
    input.click()
  })
}

function browserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function createBrowserFileService(dependencies: BrowserFileDependencies = {
  pickFile: browserPickFile,
  download: browserDownload,
}): FileService {
  return {
    async openText(options) {
      const file = await dependencies.pickFile(options)
      return file ? { name: file.name, content: await file.text() } : null
    },
    async openBytes(options) {
      const file = await dependencies.pickFile(options)
      return file ? { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) } : null
    },
    async saveText(file) {
      dependencies.download(new Blob([file.content], { type: file.mimeType }), file.filename)
      return 'saved'
    },
    async saveBytes(options) {
      dependencies.download(new Blob([options.bytes.slice().buffer], { type: options.mimeType }), options.filename)
      return 'saved'
    },
  }
}

function filename(path: string) {
  return path.split(/[\\/]/).pop() || path
}

function saveFilters(file: TextExport | SaveBytesOptions): FileFilter[] {
  const extension = file.filename.split('.').pop()?.toLowerCase()
  if (extension === 'md' || extension === 'markdown') return [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
  if (extension === 'html' || extension === 'htm') return [{ name: 'HTML', extensions: ['html', 'htm'] }]
  if (extension === 'wechatmd') return [{ name: 'WeChat MD 备份', extensions: ['wechatmd'] }]
  return extension ? [{ name: '文件', extensions: [extension] }] : []
}

export function createDesktopFileService(dependencies: DesktopFileDependencies): FileService {
  return {
    async openText(options) {
      const path = await dependencies.open(options)
      return path ? { name: filename(path), content: await dependencies.readTextFile(path) } : null
    },
    async openBytes(options) {
      const path = await dependencies.open(options)
      return path ? { name: filename(path), bytes: await dependencies.readFile(path) } : null
    },
    async saveText(file) {
      const path = await dependencies.save({ defaultPath: file.filename, filters: saveFilters(file) })
      if (!path) return 'cancelled'
      await dependencies.writeTextFile(path, file.content)
      return 'saved'
    },
    async saveBytes(options) {
      const path = await dependencies.save({ defaultPath: options.filename, filters: saveFilters(options) })
      if (!path) return 'cancelled'
      await dependencies.writeFile(path, options.bytes)
      return 'saved'
    },
  }
}
