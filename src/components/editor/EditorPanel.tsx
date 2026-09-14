import { ImagePlus, Maximize2, Minimize2 } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { scrollTopForSourceLine } from '../../features/sync/blockSync'
import { createAnimatedScrollController } from '../../features/sync/animatedScroll'
import { IconButton, Tabs } from '../ui'
import styles from './EditorPanel.module.css'

export interface EditorSelection {
  startOffset: number
  endOffset: number
  startLine: number
  endLine: number
  text: string
}

export type EditorSelectionOrigin = 'user' | 'programmatic'

export interface EditorPanelHandle {
  focusLines: (startLine: number, endLine: number) => void
  setScrollRatio: (ratio: number) => void
  insertText: (text: string) => void
}

export interface EditorPanelProps {
  value: string
  onChange: (value: string) => void
  tab: string
  onTabChange: (tab: string) => void
  onSelectionChange?: (selection: EditorSelection, origin: EditorSelectionOrigin) => void
  onScrollRatioChange?: (ratio: number) => void
  onUserInteraction?: () => void
  fullscreen?: boolean
  onFullscreenChange?: (fullscreen: boolean) => void
  onImageFiles?: (files: File[], source: 'file' | 'paste' | 'drop') => void
}

interface OutlineItem {
  level: number
  line: number
  title: string
}

function readOutline(value: string): OutlineItem[] {
  const items: OutlineItem[] = []
  let fence: '`' | '~' | undefined
  value.split('\n').forEach((line, index) => {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line)
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as '`' | '~'
      fence = fence === marker ? undefined : fence ?? marker
      return
    }
    if (fence) return
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line)
    if (match) items.push({ level: match[1].length, line: index + 1, title: match[2].replace(/\s+#+$/, '') })
  })
  return items
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
  { value, onChange, tab, onTabChange, onSelectionChange, onScrollRatioChange, onUserInteraction, fullscreen = false, onFullscreenChange, onImageFiles },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const programmaticSelectionRef = useRef(false)
  const scrollControllerRef = useRef<ReturnType<typeof createAnimatedScrollController> | null>(null)
  scrollControllerRef.current ??= createAnimatedScrollController({
    read: () => textareaRef.current?.scrollTop ?? 0,
    write: (scrollTop) => { if (textareaRef.current) textareaRef.current.scrollTop = scrollTop },
  })
  const lineCount = Math.max(30, value.split('\n').length)
  const outline = useMemo(() => readOutline(value), [value])

  useEffect(() => () => scrollControllerRef.current?.cancel(), [])

  const reportSelection = () => {
    const origin = programmaticSelectionRef.current ? 'programmatic' : 'user'
    if (origin === 'user') onUserInteraction?.()
    if (textareaRef.current) onSelectionChange?.(readSelection(textareaRef.current), origin)
  }

  const focusLines = (startLine: number, endLine: number) => {
      const textarea = textareaRef.current
      if (!textarea) return
      const start = offsetAtLine(textarea.value, startLine)
      const endLineStart = offsetAtLine(textarea.value, endLine)
      const lineEnd = textarea.value.indexOf('\n', endLineStart)
      const end = lineEnd === -1 ? textarea.value.length : lineEnd
      programmaticSelectionRef.current = true
      textarea.focus()
      textarea.setSelectionRange(start, end)
      const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || 28
      scrollControllerRef.current?.scrollTo(scrollTopForSourceLine(startLine, {
        lineHeight,
        clientHeight: textarea.clientHeight,
        scrollHeight: textarea.scrollHeight,
      }))
      onSelectionChange?.(readSelection(textarea), 'programmatic')
      requestAnimationFrame(() => { programmaticSelectionRef.current = false })
  }

  useImperativeHandle(ref, () => ({
    focusLines,
    insertText(text) {
      const textarea = textareaRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const before = textarea.value.slice(0, start)
      const after = textarea.value.slice(end)
      const prefix = before && !before.endsWith('\n') ? '\n\n' : ''
      const suffix = after && !after.startsWith('\n') ? '\n\n' : ''
      const nextValue = `${before}${prefix}${text}${suffix}${after}`
      const nextOffset = before.length + prefix.length + text.length
      onChange(nextValue)
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(nextOffset, nextOffset)
        onSelectionChange?.(readSelection(textarea), 'programmatic')
      })
    },
    setScrollRatio(ratio) {
      const textarea = textareaRef.current
      if (!textarea) return
      const maximum = Math.max(0, textarea.scrollHeight - textarea.clientHeight)
      scrollControllerRef.current?.scrollTo(maximum * Math.min(1, Math.max(0, ratio)))
    },
  }))

  const activateOutlineItem = (item: OutlineItem) => {
    onTabChange('edit')
    requestAnimationFrame(() => focusLines(item.line, item.line))
  }

  const reportScroll = () => {
    const textarea = textareaRef.current
    if (!textarea || scrollControllerRef.current?.isFollowing()) return
    onUserInteraction?.()
    const maximum = Math.max(0, textarea.scrollHeight - textarea.clientHeight)
    onScrollRatioChange?.(maximum ? textarea.scrollTop / maximum : 0)
  }

  return (
    <section className={styles.panel} aria-label="Markdown 编辑器">
      <header className={styles.header}>
        <Tabs ariaLabel="编辑区域" items={[{ value: 'edit', label: '编辑' }, { value: 'outline', label: '大纲' }]} value={tab} onValueChange={onTabChange} />
        <div className={styles.meta}>
          <span>{value.length} 字</span>
          <IconButton label="插入图片" onClick={() => imageInputRef.current?.click()}><ImagePlus size={16} /></IconButton>
          <input
            ref={imageInputRef}
            hidden
            type="file"
            accept="image/*"
            multiple
            aria-label="选择要插入的图片"
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? [])
              if (files.length) onImageFiles?.(files, 'file')
              event.currentTarget.value = ''
            }}
          />
          <IconButton label={fullscreen ? '退出全屏编辑' : '全屏编辑'} onClick={() => onFullscreenChange?.(!fullscreen)}>
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </IconButton>
        </div>
      </header>
      {tab === 'edit' ? <div className={styles.editorBody}>
        <div className={styles.lineNumbers} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, index) => <span key={index}>{index + 1}</span>)}
        </div>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          aria-label="Markdown 内容"
          spellCheck={false}
          value={value}
          onChange={(event) => { onUserInteraction?.(); onChange(event.target.value) }}
          onSelect={reportSelection}
          onScroll={reportScroll}
          onWheel={() => scrollControllerRef.current?.cancel()}
          onPointerDown={() => scrollControllerRef.current?.cancel()}
          onTouchStart={() => scrollControllerRef.current?.cancel()}
          onPaste={(event) => {
            const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'))
            if (!files.length) return
            event.preventDefault()
            onImageFiles?.(files, 'paste')
          }}
          onDragOver={(event) => {
            if (Array.from(event.dataTransfer.items).some((item) => item.kind === 'file')) event.preventDefault()
          }}
          onDrop={(event) => {
            const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'))
            if (!files.length) return
            event.preventDefault()
            onImageFiles?.(files, 'drop')
          }}
        />
      </div> : <nav className={styles.outline} aria-label="文章大纲">
        {outline.map((item) => (
          <button
            type="button"
            key={`${item.line}-${item.title}`}
            aria-label={`前往 ${item.title}`}
            data-level={item.level}
            onClick={() => activateOutlineItem(item)}
          >
            <span>{item.title}</span><small>第 {item.line} 行</small>
          </button>
        ))}
        {outline.length === 0 && <p>添加 Markdown 标题后，这里会生成文章大纲。</p>}
      </nav>}
    </section>
  )
})
