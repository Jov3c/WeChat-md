export type DiffLineKind = 'context' | 'added' | 'removed'

export interface DiffLine {
  kind: DiffLineKind
  text: string
  oldLine?: number
  newLine?: number
}

function splitLines(content: string) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  if (lines.at(-1) === '') lines.pop()
  return lines.length === 1 && lines[0] === '' ? [] : lines
}

export function createLineDiff(historicalContent: string, currentContent: string): DiffLine[] {
  const oldLines = splitLines(historicalContent)
  const newLines = splitLines(currentContent)
  if (oldLines.length === newLines.length && oldLines.every((line, index) => line === newLines[index])) return []

  const lengths = Array.from({ length: oldLines.length + 1 }, () => new Uint32Array(newLines.length + 1))
  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex -= 1) {
      lengths[oldIndex][newIndex] = oldLines[oldIndex] === newLines[newIndex]
        ? lengths[oldIndex + 1][newIndex + 1] + 1
        : Math.max(lengths[oldIndex + 1][newIndex], lengths[oldIndex][newIndex + 1])
    }
  }

  const result: DiffLine[] = []
  let oldIndex = 0
  let newIndex = 0
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex < oldLines.length && newIndex < newLines.length && oldLines[oldIndex] === newLines[newIndex]) {
      result.push({ kind: 'context', text: oldLines[oldIndex], oldLine: oldIndex + 1, newLine: newIndex + 1 })
      oldIndex += 1
      newIndex += 1
    } else if (oldIndex < oldLines.length && (newIndex >= newLines.length || lengths[oldIndex + 1][newIndex] >= lengths[oldIndex][newIndex + 1])) {
      result.push({ kind: 'removed', text: oldLines[oldIndex], oldLine: oldIndex + 1 })
      oldIndex += 1
    } else {
      result.push({ kind: 'added', text: newLines[newIndex], newLine: newIndex + 1 })
      newIndex += 1
    }
  }
  return result
}
