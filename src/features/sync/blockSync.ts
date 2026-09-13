export interface EditorViewportMetrics {
  scrollTop: number
  clientHeight: number
  lineHeight: number
  lineCount: number
}

export interface PreviewBlockMetrics {
  startLine: number
  endLine: number
  top: number
  bottom: number
}

export function editorViewportAnchorLine(metrics: EditorViewportMetrics) {
  const lineHeight = Math.max(1, metrics.lineHeight)
  const line = Math.floor((metrics.scrollTop + metrics.clientHeight / 3) / lineHeight) + 1
  return Math.max(1, Math.min(metrics.lineCount, line))
}

export function previewBlockAtViewport(blocks: PreviewBlockMetrics[], viewportTop: number, viewportHeight: number) {
  if (blocks.length === 0) return undefined
  const readingLine = viewportTop + viewportHeight / 3
  const crossing = blocks.find((block) => block.top <= readingLine && block.bottom >= readingLine)
  const closest = crossing ?? blocks.reduce((best, block) => {
    const distance = Math.abs((block.top + block.bottom) / 2 - readingLine)
    const bestDistance = Math.abs((best.top + best.bottom) / 2 - readingLine)
    return distance < bestDistance ? block : best
  })
  return { startLine: closest.startLine, endLine: closest.endLine }
}

export function scrollTopForSourceLine(
  line: number,
  metrics: Pick<EditorViewportMetrics, 'lineHeight' | 'clientHeight'> & { scrollHeight: number },
) {
  const desired = (Math.max(1, line) - 1) * Math.max(1, metrics.lineHeight) - metrics.clientHeight / 3
  return Math.max(0, Math.min(Math.max(0, metrics.scrollHeight - metrics.clientHeight), Math.round(desired)))
}
