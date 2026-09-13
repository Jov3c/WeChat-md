import type { ImageAssetSource, StoredImageAsset } from './assetRepository'

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024

interface AssetCreationOptions {
  id?: string
  now?: string
}

interface FetchImageAssetOptions extends AssetCreationOptions {
  fetcher?: typeof fetch
}

function createAssetId() {
  return globalThis.crypto?.randomUUID?.() ?? `image-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function validateImage(blob: Blob) {
  if (!blob.type.toLowerCase().startsWith('image/')) throw new Error('请选择图片文件')
  if (blob.size > MAX_IMAGE_BYTES) throw new Error('单张图片不能超过 20 MB')
}

export function createStoredImageAsset(
  file: File,
  source: ImageAssetSource,
  { id = createAssetId(), now = new Date().toISOString() }: AssetCreationOptions = {},
): StoredImageAsset {
  validateImage(file)
  return {
    id,
    name: file.name || `图片.${file.type.split('/')[1] || 'png'}`,
    mimeType: file.type,
    size: file.size,
    createdAt: now,
    source,
    blob: file,
  }
}

export async function fetchImageAsset(
  input: string,
  source: Extract<ImageAssetSource, 'remote' | 'wechat'>,
  { fetcher = fetch, id = createAssetId(), now = new Date().toISOString() }: FetchImageAssetOptions = {},
) {
  let url: URL
  try { url = new URL(input) } catch { throw new Error('请输入完整的图片链接') }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('仅支持 http 或 https 图片链接')

  const response = await fetcher(url.toString())
  if (!response.ok) throw new Error('图片下载失败，请检查链接后重试')
  const blob = await response.blob()
  validateImage(blob)
  const pathnameName = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '')
  const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
  const name = pathnameName.includes('.') ? pathnameName : `网络图片.${extension}`
  return {
    id,
    name,
    mimeType: blob.type,
    size: blob.size,
    createdAt: now,
    source,
    sourceUrl: url.toString(),
    blob,
  } satisfies StoredImageAsset
}
