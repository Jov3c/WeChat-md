import { describe, expect, it } from 'vitest'
import { editorViewportAnchorLine, previewBlockAtViewport, scrollTopForSourceLine } from './blockSync'

describe('block based editor and preview synchronization', () => {
  it('maps the editor reading position to a source line instead of a scroll percentage', () => {
    expect(editorViewportAnchorLine({ scrollTop: 252, clientHeight: 84, lineHeight: 28, lineCount: 40 })).toBe(11)
  })

  it('finds the preview block crossing the reading line', () => {
    expect(previewBlockAtViewport([
      { startLine: 1, endLine: 2, top: -180, bottom: -80 },
      { startLine: 4, endLine: 8, top: 40, bottom: 170 },
      { startLine: 10, endLine: 12, top: 210, bottom: 300 },
    ], 0, 300)).toEqual({ startLine: 4, endLine: 8 })
  })

  it('aligns a source line near the editor reading line and clamps both ends', () => {
    expect(scrollTopForSourceLine(20, { lineHeight: 28, clientHeight: 280, scrollHeight: 1400 })).toBe(439)
    expect(scrollTopForSourceLine(1, { lineHeight: 28, clientHeight: 280, scrollHeight: 1400 })).toBe(0)
    expect(scrollTopForSourceLine(100, { lineHeight: 28, clientHeight: 280, scrollHeight: 1400 })).toBe(1120)
  })
})
