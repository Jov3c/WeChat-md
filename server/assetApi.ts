import { isIP } from 'node:net'

const MAX_IMAGE_BYTES = 20 * 1024 * 1024

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  return parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || parts[0] === 0
}

function validateRemoteUrl(input: string) {
  let url: URL
  try { url = new URL(input) } catch { throw new Error('图片地址不安全或无效') }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (!['http:', 'https:'].includes(url.protocol)
    || hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || isPrivateIpv4(hostname)
    || (isIP(hostname) === 6 && (hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80:')))) {
    throw new Error('图片地址不安全或无效')
  }
  return url
}

export interface FetchRemoteImageOptions {
  fetcher?: typeof fetch
}

export async function fetchRemoteImage(input: string, { fetcher = fetch }: FetchRemoteImageOptions = {}) {
  let url = validateRemoteUrl(input)
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetcher(url, { redirect: 'manual', headers: { accept: 'image/*' } })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location || redirects === 3) throw new Error('图片下载失败')
      url = validateRemoteUrl(new URL(location, url).toString())
      continue
    }
    if (!response.ok) throw new Error('图片下载失败')
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!contentType.startsWith('image/')) throw new Error('链接内容不是图片')
    const declaredSize = Number(response.headers.get('content-length') || 0)
    if (declaredSize > MAX_IMAGE_BYTES) throw new Error('单张图片不能超过 20 MB')
    const body = new Uint8Array(await response.arrayBuffer())
    if (body.byteLength > MAX_IMAGE_BYTES) throw new Error('单张图片不能超过 20 MB')
    return { body, contentType }
  }
  throw new Error('图片下载失败')
}

export async function handleAssetFetchRequest(request: Request) {
  try {
    const target = new URL(request.url).searchParams.get('url') ?? ''
    const image = await fetchRemoteImage(target)
    return new Response(image.body as BodyInit, {
      status: 200,
      headers: { 'content-type': image.contentType, 'cache-control': 'no-store' },
    })
  } catch (reason) {
    return Response.json({ ok: false, error: { message: reason instanceof Error ? reason.message : '图片下载失败' } }, { status: 400 })
  }
}
