import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'
import type { IncomingMessage, ServerResponse } from 'node:http'

async function handleNodeRequest(request: IncomingMessage, response: ServerResponse) {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  const webRequest = new Request(`http://localhost${request.url || '/'}`, {
    method: request.method,
    headers: request.headers as HeadersInit,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  })
  const result = request.url?.startsWith('/?url=') || request.url?.startsWith('?url=')
    ? await (await import('./server/assetApi.ts')).handleAssetFetchRequest(webRequest)
    : await (await import('./server/wechatApi.ts')).handleWechatExtractRequest(webRequest)
  response.statusCode = result.status
  result.headers.forEach((value, key) => response.setHeader(key, value))
  response.end(Buffer.from(await result.arrayBuffer()))
}

function wechatExtractPlugin(): Plugin {
  const install = (middlewares: { use: (path: string, handler: (request: IncomingMessage, response: ServerResponse) => void) => void }) => {
    middlewares.use('/api/wechat/extract', (request, response) => { void handleNodeRequest(request, response) })
    middlewares.use('/api/assets/fetch', (request, response) => { void handleNodeRequest(request, response) })
  }
  return {
    name: 'wechat-local-extractor',
    configureServer(server) { install(server.middlewares) },
    configurePreviewServer(server) { install(server.middlewares) },
  }
}

export default defineConfig({
  plugins: [react(), wechatExtractPlugin()],
  optimizeDeps: {
    exclude: ['juice', 'juice/client'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    testTimeout: 10_000,
  },
})
