import { invoke } from '@tauri-apps/api/core'
import { parseWechatArticleHtml } from '../features/wechat/parseWechatArticle'
import { normalizeWechatArticleUrl } from '../features/wechat/wechatExtraction'
import type { ExtractedWechatArticle } from '../features/wechat/wechatExtraction'

export type InvokeCommand = (command: string, args?: Record<string, unknown>) => Promise<unknown>

const invokeCommand: InvokeCommand = (command, args) => invoke(command, args)

export function createDesktopWechatExtractor(run: InvokeCommand = invokeCommand) {
  return async (input: string): Promise<ExtractedWechatArticle> => {
    const url = normalizeWechatArticleUrl(input)
    const response = await run('fetch_wechat_html', { input: url }) as { html: string; finalUrl: string }
    return parseWechatArticleHtml(response.html, response.finalUrl)
  }
}

export function createDesktopImageFetcher(run: InvokeCommand = invokeCommand): typeof fetch {
  return async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const response = await run('fetch_remote_image', { input: url }) as { bytes: number[]; mimeType: string }
    return new Response(new Uint8Array(response.bytes), {
      status: 200,
      headers: { 'content-type': response.mimeType },
    })
  }
}
