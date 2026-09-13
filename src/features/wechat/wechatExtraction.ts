import { updateStylePreset, type StylePreset, type StyleValuePath } from '../styles/stylePresets'

export interface ExtractedStyleToken {
  path: StyleValuePath
  label: string
  value: string | number | boolean
  displayValue: string
  swatch?: string
  group?: 'global' | 'heading' | 'component'
}

export interface ExtractedComponent {
  kind: 'heading' | 'quote' | 'list' | 'table' | 'image' | 'divider' | 'card'
  label: string
  count: number
}

export interface ExtractedWechatArticle {
  sourceUrl: string
  title: string
  author: string
  html: string
  markdown: string
  tokens: ExtractedStyleToken[]
  components: ExtractedComponent[]
}

export function normalizeWechatArticleUrl(input: string) {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    throw new Error('请粘贴完整的公众号文章链接')
  }

  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'mp.weixin.qq.com') {
    throw new Error('目前仅支持微信公众号文章链接')
  }

  url.hash = ''
  return url.toString()
}

export function applyExtractedStyle(
  base: StylePreset,
  extraction: ExtractedWechatArticle,
  selectedPaths: StyleValuePath[],
) {
  const selected = new Set(selectedPaths)
  return extraction.tokens.reduce(
    (preset, token) => selected.has(token.path)
      ? updateStylePreset(preset, token.path, token.value)
      : preset,
    base,
  )
}

export interface ExtractWechatArticleOptions {
  fetcher?: typeof fetch
  signal?: AbortSignal
}

export async function extractWechatArticle(
  input: string,
  { fetcher = fetch, signal }: ExtractWechatArticleOptions = {},
): Promise<ExtractedWechatArticle> {
  const url = normalizeWechatArticleUrl(input)
  const response = await fetcher('/api/wechat/extract', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
    signal,
  })
  const payload = await response.json() as {
    ok: boolean
    data?: ExtractedWechatArticle
    error?: { message?: string }
  }
  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error?.message || '暂时无法读取这篇文章，请稍后重试')
  }
  return payload.data
}
