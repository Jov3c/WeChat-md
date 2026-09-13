interface TextSegment {
  node: Text
  start: number
  end: number
}

export function findTextRange(root: HTMLElement, selectedText: string) {
  if (!selectedText) return undefined
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const segments: TextSegment[] = []
  let text = ''
  let current = walker.nextNode()

  while (current) {
    const node = current as Text
    if (!node.parentElement?.closest('[data-highlight-ignore]')) {
      const start = text.length
      text += node.data
      segments.push({ node, start, end: text.length })
    }
    current = walker.nextNode()
  }

  const selectionStart = text.indexOf(selectedText)
  if (selectionStart < 0) return undefined
  const selectionEnd = selectionStart + selectedText.length
  const startSegment = segments.find((segment) => segment.end > selectionStart)
  const endSegment = [...segments].reverse().find((segment) => segment.start < selectionEnd)
  if (!startSegment || !endSegment) return undefined

  const range = document.createRange()
  range.setStart(startSegment.node, selectionStart - startSegment.start)
  range.setEnd(endSegment.node, selectionEnd - endSegment.start)
  return range
}
