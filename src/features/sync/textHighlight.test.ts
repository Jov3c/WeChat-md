import { describe, expect, it } from 'vitest'
import { findTextRange } from './textHighlight'

describe('preview text selection range', () => {
  it('locates the exact selected text across nested inline elements', () => {
    const root = document.createElement('p')
    root.innerHTML = '这一段包含<strong>精确的重点</strong>文字。'

    const range = findTextRange(root, '包含精确的重点文字')

    expect(range?.toString()).toBe('包含精确的重点文字')
  })

  it('ignores editor-only heading number markers', () => {
    const root = document.createElement('h2')
    root.innerHTML = '<span data-highlight-ignore>2</span>安装 Ollama'

    expect(findTextRange(root, '安装 Ollama')?.toString()).toBe('安装 Ollama')
  })
})
