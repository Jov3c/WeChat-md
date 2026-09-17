import { Monitor, MoreHorizontal, PanelRightOpen, Smartphone } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type MouseEvent, type Ref } from 'react'
import { createAnimatedScrollController } from '../../features/sync/animatedScroll'
import { findTextRange } from '../../features/sync/textHighlight'
import { stylePresetToAttributes, stylePresetToCssVariables } from '../../features/styles/stylePresentation'
import { builtInStylePresets, type StylePreset } from '../../features/styles/stylePresets'
import type { ArticleLayoutId } from '../../features/layouts/articleLayouts'
import { DropdownMenu, IconButton, ScrollArea } from '../ui'
import { MarkdownRenderer, type PreviewSelection } from './MarkdownRenderer'
import styles from './PreviewPanel.module.css'

export type PreviewDevice = 'desktop' | 'mobile'

export interface PreviewPanelHandle {
  setScrollRatio: (ratio: number) => void
  revealLines: (startLine: number, endLine: number) => void
  resumeFollowing: () => void
}

export interface PreviewPanelProps {
  markdown: string
  articleRef?: Ref<HTMLElement>
  device: PreviewDevice
  onDeviceChange: (device: PreviewDevice) => void
  syncEnabled: boolean
  selection?: PreviewSelection
  onSyncEnabledChange: (enabled: boolean) => void
  onBlockActivate: (startLine: number, endLine: number) => void
  onScrollRatioChange?: (ratio: number) => void
  settingsOpen: boolean
  onShowSettings: () => void
  onOpenPageSettings?: () => void
  onCopy?: () => void
  stylePreset?: StylePreset
  layoutId?: ArticleLayoutId
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value)
  else if (ref) ref.current = value
}

const selectionHighlightName = 'wechat-preview-selection'

function highlightRegistry() {
  return (globalThis.CSS as typeof CSS & {
    highlights?: { set: (name: string, highlight: unknown) => void; delete: (name: string) => void }
  } | undefined)?.highlights
}

export const PreviewPanel = forwardRef<PreviewPanelHandle, PreviewPanelProps>(function PreviewPanel(
  { markdown, articleRef, device, onDeviceChange, syncEnabled, selection, onSyncEnabledChange, onBlockActivate, onScrollRatioChange, settingsOpen, onShowSettings, onOpenPageSettings = onShowSettings, onCopy = () => undefined, stylePreset = builtInStylePresets[0], layoutId = 'standard' },
  ref,
) {
  const localArticleRef = useRef<HTMLElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const scrollControllerRef = useRef<ReturnType<typeof createAnimatedScrollController> | null>(null)
  scrollControllerRef.current ??= createAnimatedScrollController({
    read: () => viewportRef.current?.scrollTop ?? 0,
    write: (scrollTop) => { if (viewportRef.current) viewportRef.current.scrollTop = scrollTop },
  })
  const [cursorPulse, setCursorPulse] = useState(true)

  useImperativeHandle(ref, () => ({
    setScrollRatio(ratio) {
      const viewport = viewportRef.current
      if (!viewport) return
      const maximum = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
      scrollControllerRef.current?.scrollTo(maximum * Math.min(1, Math.max(0, ratio)))
    },
    revealLines(startLine, endLine) {
      const viewport = viewportRef.current
      const article = localArticleRef.current
      if (!viewport || !article) return
      const blocks = Array.from(article.querySelectorAll<HTMLElement>('[data-source-start]'))
      const target = blocks.find((block) => {
        const blockStart = Number(block.dataset.sourceStart)
        const blockEnd = Number(block.dataset.sourceEnd)
        return blockStart <= startLine && blockEnd >= startLine
      }) ?? blocks.find((block) => {
        const blockStart = Number(block.dataset.sourceStart)
        const blockEnd = Number(block.dataset.sourceEnd)
        return blockStart <= endLine && blockEnd >= startLine
      })
      if (!target) return

      const viewportRect = viewport.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const edgePadding = 24
      if (targetRect.top >= viewportRect.top + edgePadding && targetRect.bottom <= viewportRect.bottom - edgePadding) return

      const viewportHeight = viewport.clientHeight || viewportRect.height
      const maximum = Math.max(0, viewport.scrollHeight - viewportHeight)
      const centeredTop = viewport.scrollTop + targetRect.top - viewportRect.top - (viewportHeight - targetRect.height) / 2
      scrollControllerRef.current?.scrollTo(Math.max(0, Math.min(maximum, Math.round(centeredTop))))
    },
    resumeFollowing() {
      scrollControllerRef.current?.cancel()
    },
  }), [])

  useEffect(() => () => scrollControllerRef.current?.cancel(), [])

  useEffect(() => {
    if (!selection || selection.text) {
      setCursorPulse(false)
      return
    }
    setCursorPulse(true)
    const timeout = window.setTimeout(() => setCursorPulse(false), 900)
    return () => window.clearTimeout(timeout)
  }, [selection?.startLine, selection?.endLine, selection?.text])

  useEffect(() => {
    const registry = highlightRegistry()
    registry?.delete(selectionHighlightName)
    if (!registry || !selection?.text || !localArticleRef.current) return
    const selectedBlock = localArticleRef.current.querySelector<HTMLElement>('[data-selection-active=\"true\"]')
    const range = findTextRange(selectedBlock ?? localArticleRef.current, selection.text)
    const HighlightConstructor = (globalThis as typeof globalThis & {
      Highlight?: new (...ranges: Range[]) => unknown
    }).Highlight
    if (!range || !HighlightConstructor) return
    registry.set(selectionHighlightName, new HighlightConstructor(range))
    return () => { registry.delete(selectionHighlightName) }
  }, [markdown, selection?.startLine, selection?.endLine, selection?.text])

  const activateBlock = (event: MouseEvent<HTMLElement>) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-source-start]')
    if (!target) return
    onBlockActivate(Number(target.dataset.sourceStart), Number(target.dataset.sourceEnd))
  }

  const reportScroll = () => {
    const viewport = viewportRef.current
    if (!viewport || scrollControllerRef.current?.isFollowing()) return
    const maximum = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
    onScrollRatioChange?.(maximum ? viewport.scrollTop / maximum : 0)
  }

  return (
    <section className={styles.panel} aria-label="公众号预览" data-device={device}>
      <header className={styles.header}>
        <div className={styles.previewTitle}>
          <strong>预览</strong>
          <button className={styles.syncToggle} type="button" aria-pressed={syncEnabled} onClick={() => onSyncEnabledChange(!syncEnabled)}>
            <span className={styles.syncLabel}>双栏同步已{syncEnabled ? '开启' : '关闭'}</span>
          </button>
        </div>
        <div className={styles.deviceActions}>
          {!settingsOpen && <IconButton label="显示右侧边栏" onClick={onShowSettings}><PanelRightOpen size={16} /></IconButton>}
          <IconButton label="桌面预览" data-active={device === 'desktop'} onClick={() => onDeviceChange('desktop')}><Monitor size={16} /></IconButton>
          <IconButton label="手机预览" data-active={device === 'mobile'} onClick={() => onDeviceChange('mobile')}><Smartphone size={16} /></IconButton>
          <DropdownMenu
            trigger={<IconButton label="预览更多操作"><MoreHorizontal size={18} /></IconButton>}
            items={[
              { id: 'preview-page-settings', label: '页面设置', onSelect: onOpenPageSettings },
              { id: 'preview-copy', label: '复制到公众号', onSelect: onCopy },
            ]}
          />
        </div>
      </header>
      <div className={styles.canvas}>
        <ScrollArea viewportProps={{
          ref: viewportRef,
          role: 'region',
          'aria-label': '预览滚动区域',
          onScroll: reportScroll,
          onWheel: () => scrollControllerRef.current?.cancel(),
          onPointerDown: () => scrollControllerRef.current?.cancel(),
          onTouchStart: () => scrollControllerRef.current?.cancel(),
        }}>
          <article
            ref={(node) => { localArticleRef.current = node; assignRef(articleRef, node) }}
            className={styles.article}
            data-exact-selection={Boolean(highlightRegistry())}
            data-template-layout={layoutId}
            onClick={activateBlock}
            style={stylePresetToCssVariables(stylePreset) as CSSProperties}
            {...stylePresetToAttributes(stylePreset)}
          >
            <MarkdownRenderer markdown={markdown} selection={selection?.text || cursorPulse ? selection : undefined} numbering={{
              h1: stylePreset.headings.h1.numbered,
              h2: stylePreset.headings.h2.numbered,
              h3: stylePreset.headings.h3.numbered,
            }} />
          </article>
        </ScrollArea>
      </div>
    </section>
  )
})
