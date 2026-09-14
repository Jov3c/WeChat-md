export interface ArchivedImageInput {
  name: string
  mimeType: string
  bytes: Uint8Array
}

export interface SavedArticleImages {
  directory: string
  saved: number
}

export interface DesktopImageArchive {
  getDirectory(): Promise<string>
  chooseDirectory(): Promise<string | null>
  resetDirectory(): Promise<string>
  saveArticle(title: string, images: ArchivedImageInput[]): Promise<SavedArticleImages>
  openDirectory(path?: string): Promise<void>
}

interface DesktopImageArchiveDependencies {
  invoke(command: string, args?: Record<string, unknown>): Promise<unknown>
  selectDirectory(defaultPath: string): Promise<string | null>
  storage: Storage
}

const DIRECTORY_KEY = 'wechat-md:image-save-directory'

export function createDesktopImageArchive({ invoke, selectDirectory, storage }: DesktopImageArchiveDependencies): DesktopImageArchive {
  const defaultDirectory = async () => await invoke('default_image_save_directory') as string
  const getDirectory = async () => storage.getItem(DIRECTORY_KEY) || await defaultDirectory()

  return {
    getDirectory,
    async chooseDirectory() {
      const directory = await selectDirectory(await getDirectory())
      if (directory) storage.setItem(DIRECTORY_KEY, directory)
      return directory
    },
    async resetDirectory() {
      storage.removeItem(DIRECTORY_KEY)
      return await defaultDirectory()
    },
    async saveArticle(title, images) {
      return await invoke('save_article_images', {
        baseDirectory: await getDirectory(),
        articleTitle: title,
        images: images.map((image) => ({ ...image, bytes: Array.from(image.bytes) })),
      }) as SavedArticleImages
    },
    async openDirectory(path) {
      await invoke('open_image_directory', { path: path || await getDirectory() })
    },
  }
}
