import { Monitor, MoreHorizontal, PanelRightOpen, Smartphone } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef, type MouseEvent, type Ref } from 'react'
import { IconButton, ScrollArea } from '../ui'
import { MarkdownRenderer, type PreviewSelection } from './MarkdownRenderer'
import styles from './PreviewPanel.module.css'

export type PreviewDevice = 'desktop' | 'mobile'

export interface PreviewPanelHandle {
  setScrollRatio: (ratio: number) => void
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
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value)
  else if (ref) ref.current = value
}

export const PreviewPanel = forwardRef<PreviewPanelHandle, PreviewPanelProps>(function PreviewPanel(
  { markdown, articleRef, device, onDeviceChange, syncEnabled, selection, onSyncEnabledChange, onBlockActivate, onScrollRatioChange, settingsOpen, onShowSettings },
  ref,
) {
  const localArticleRef = useRef<HTMLElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const suppressScrollRef = useRef(false)

  useImperativeHandle(ref, () => ({
    setScrollRatio(ratio) {
      const viewport = viewportRef.current
      if (!viewport) return
      suppressScrollRef.current = true
      viewport.scrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight) * ratio
      requestAnimationFrame(() => { suppressScrollRef.current = false })
    },
  }), [])

  useEffect(() => {
    if (!syncEnabled) return
    const activeBlock = localArticleRef.current?.querySelector<HTMLElement>('[data-sync-active="true"]')
    if (activeBlock) {
      suppressScrollRef.current = true
      activeBlock.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
      requestAnimationFrame(() => { suppressScrollRef.current = false })
    }
  }, [selection?.startLine, syncEnabled])

  const activateBlock = (event: MouseEvent<HTMLElement>) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-source-start]')
    if (!target) return
    onBlockActivate(Number(target.dataset.sourceStart), Number(target.dataset.sourceEnd))
  }

  const reportScroll = () => {
    const viewport = viewportRef.current
    if (!viewport || suppressScrollRef.current) return
    const scrollRange = viewport.scrollHeight - viewport.clientHeight
    onScrollRatioChange?.(scrollRange > 0 ? viewport.scrollTop / scrollRange : 0)
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
          <IconButton label="预览更多操作"><MoreHorizontal size={18} /></IconButton>
        </div>
      </header>
      <div className={styles.canvas}>
        <ScrollArea viewportProps={{ ref: viewportRef, role: 'region', 'aria-label': '预览滚动区域', onScroll: reportScroll }}>
          <article
            ref={(node) => { localArticleRef.current = node; assignRef(articleRef, node) }}
            className={styles.article}
            onClick={activateBlock}
          >
            <MarkdownRenderer markdown={markdown} selection={selection} />
          </article>
        </ScrollArea>
      </div>
    </section>
  )
})
