import { Maximize2 } from 'lucide-react'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import { IconButton, Tabs } from '../ui'
import styles from './EditorPanel.module.css'

export interface EditorSelection {
  startOffset: number
  endOffset: number
  startLine: number
  endLine: number
  text: string
}

export interface EditorPanelHandle {
  focusLines: (startLine: number, endLine: number) => void
  setScrollRatio: (ratio: number) => void
}

export interface EditorPanelProps {
  value: string
  onChange: (value: string) => void
  tab: string
  onTabChange: (tab: string) => void
  onSelectionChange?: (selection: EditorSelection) => void
  onScrollRatioChange?: (ratio: number) => void
}

function lineAtOffset(value: string, offset: number) {
  return value.slice(0, offset).split('\n').length
}

function offsetAtLine(value: string, line: number) {
  if (line <= 1) return 0
  let offset = 0
  const lines = value.split('\n')
  for (let index = 0; index < Math.min(line - 1, lines.length); index += 1) {
    offset += lines[index].length + 1
  }
  return Math.min(offset, value.length)
}

function readSelection(textarea: HTMLTextAreaElement): EditorSelection {
  const { selectionStart, selectionEnd, value } = textarea
  return {
    startOffset: selectionStart,
    endOffset: selectionEnd,
    startLine: lineAtOffset(value, selectionStart),
    endLine: lineAtOffset(value, selectionEnd),
    text: value.slice(selectionStart, selectionEnd),
  }
}

export const EditorPanel = forwardRef<EditorPanelHandle, EditorPanelProps>(function EditorPanel(
  { value, onChange, tab, onTabChange, onSelectionChange, onScrollRatioChange },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const suppressScrollRef = useRef(false)
  const lineCount = Math.max(30, value.split('\n').length)

  const reportSelection = () => {
    if (textareaRef.current) onSelectionChange?.(readSelection(textareaRef.current))
  }

  useImperativeHandle(ref, () => ({
    focusLines(startLine, endLine) {
      const textarea = textareaRef.current
      if (!textarea) return
      const start = offsetAtLine(textarea.value, startLine)
      const endLineStart = offsetAtLine(textarea.value, endLine)
      const lineEnd = textarea.value.indexOf('\n', endLineStart)
      const end = lineEnd === -1 ? textarea.value.length : lineEnd
      textarea.focus()
      textarea.setSelectionRange(start, end)
      const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || 28
      textarea.scrollTop = Math.max(0, (startLine - 2) * lineHeight)
      onSelectionChange?.(readSelection(textarea))
    },
    setScrollRatio(ratio) {
      const textarea = textareaRef.current
      if (!textarea) return
      suppressScrollRef.current = true
      textarea.scrollTop = Math.max(0, textarea.scrollHeight - textarea.clientHeight) * ratio
      requestAnimationFrame(() => { suppressScrollRef.current = false })
    },
  }), [onSelectionChange])

  const reportScroll = () => {
    const textarea = textareaRef.current
    if (!textarea || suppressScrollRef.current) return
    const scrollRange = textarea.scrollHeight - textarea.clientHeight
    onScrollRatioChange?.(scrollRange > 0 ? textarea.scrollTop / scrollRange : 0)
  }

  return (
    <section className={styles.panel} aria-label="Markdown 编辑器">
      <header className={styles.header}>
        <Tabs ariaLabel="编辑区域" items={[{ value: 'edit', label: '编辑' }, { value: 'outline', label: '大纲' }]} value={tab} onValueChange={onTabChange} />
        <div className={styles.meta}><span>{value.length} 字</span><IconButton label="全屏编辑"><Maximize2 size={16} /></IconButton></div>
      </header>
      <div className={styles.editorBody}>
        <div className={styles.lineNumbers} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, index) => <span key={index}>{index + 1}</span>)}
        </div>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          aria-label="Markdown 内容"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onSelect={reportSelection}
          onScroll={reportScroll}
        />
      </div>
    </section>
  )
})
