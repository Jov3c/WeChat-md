import { describe, expect, it, vi } from 'vitest'
import { fetchRemoteImage } from './assetApi'

describe('remote image proxy', () => {
  it('returns a public image with its content type', async () => {
    const fetcher = async () => new Response('image', { headers: { 'content-type': 'image/png' } })

    const image = await fetchRemoteImage('https://cdn.example.com/cover.png', { fetcher })

    expect(image.contentType).toBe('image/png')
    expect(image.body.byteLength).toBe(5)
  })

  it.each(['http://localhost/a.png', 'http://127.0.0.1/a.png', 'file:///tmp/a.png'])('blocks unsafe target %s', async (url) => {
    await expect(fetchRemoteImage(url, { fetcher: vi.fn() })).rejects.toThrow('不安全')
  })

  it('rejects responses that are not images', async () => {
    const fetcher = async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } })

    await expect(fetchRemoteImage('https://example.com/page', { fetcher })).rejects.toThrow('不是图片')
  })
})
