const ASSET_SCHEME = 'asset://'
const imageAssetPattern = /!\[((?:\\.|[^\]])*)\]\(asset:\/\/([^\s)]+)\)/g
const remoteImagePattern = /!\[((?:\\.|[^\]])*)\]\((https?:\/\/[^\s)]+)\)/g

function escapeAltText(value: string) {
  return value.replace(/([\\\[\]])/g, '\\$1').replace(/[\r\n]+/g, ' ')
}

export function createImageMarkdown(assetId: string, alt = '') {
  return `![${escapeAltText(alt)}](${ASSET_SCHEME}${encodeURIComponent(assetId)})`
}

export function collectImageAssetIds(markdown: string) {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const match of markdown.matchAll(imageAssetPattern)) {
    const id = decodeURIComponent(match[2])
    if (!seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}

export function replaceImageAssetUrls(markdown: string, urls: Record<string, string>) {
  return markdown.replace(imageAssetPattern, (reference, _alt: string, encodedId: string) => {
    const url = urls[decodeURIComponent(encodedId)]
    return url ? reference.replace(`${ASSET_SCHEME}${encodedId}`, url) : reference
  })
}

export function remapImageAssetIds(markdown: string, ids: Record<string, string>) {
  return markdown.replace(imageAssetPattern, (reference, _alt: string, encodedId: string) => {
    const nextId = ids[decodeURIComponent(encodedId)]
    return nextId ? reference.replace(`${ASSET_SCHEME}${encodedId}`, `${ASSET_SCHEME}${encodeURIComponent(nextId)}`) : reference
  })
}

export function removeImageAssetReference(markdown: string, assetId: string) {
  return markdown
    .replace(imageAssetPattern, (reference, _alt: string, encodedId: string) => decodeURIComponent(encodedId) === assetId ? '' : reference)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function localizeRemoteMarkdownImages(
  markdown: string,
  importer: (url: string, alt: string) => Promise<string>,
) {
  const matches = Array.from(markdown.matchAll(remoteImagePattern))
  const urls = [...new Set(matches.map((match) => match[2]))]
  const resolved = new Map<string, string>()
  const failedUrls: string[] = []
  await Promise.all(urls.map(async (url) => {
    const alt = matches.find((match) => match[2] === url)?.[1].replace(/\\([\\\[\]])/g, '$1') ?? ''
    try { resolved.set(url, await importer(url, alt)) } catch { failedUrls.push(url) }
  }))
  return {
    markdown: markdown.replace(remoteImagePattern, (reference, alt: string, url: string) => {
      const id = resolved.get(url)
      return id ? createImageMarkdown(id, alt.replace(/\\([\\\[\]])/g, '$1')) : reference
    }),
    failedUrls,
  }
}
