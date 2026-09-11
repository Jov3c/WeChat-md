import { Monitor, MoreHorizontal, PanelRightOpen, Smartphone } from 'lucide-react'
import type { Ref } from 'react'
import { Badge, IconButton, ScrollArea } from '../ui'
import { MarkdownRenderer } from './MarkdownRenderer'
import styles from './PreviewPanel.module.css'

export type PreviewDevice = 'desktop' | 'mobile'

export interface PreviewPanelProps {
  markdown: string
  articleRef?: Ref<HTMLElement>
  device: PreviewDevice
  onDeviceChange: (device: PreviewDevice) => void
  syncEnabled: boolean
  settingsOpen: boolean
  onShowSettings: () => void
}

export function PreviewPanel({ markdown, articleRef, device, onDeviceChange, syncEnabled, settingsOpen, onShowSettings }: PreviewPanelProps) {
  return (
    <section className={styles.panel} aria-label="公众号预览" data-device={device}>
      <header className={styles.header}>
        <div className={styles.previewTitle}><strong>预览</strong><Badge>双栏同步已{syncEnabled ? '开启' : '关闭'}</Badge></div>
        <div className={styles.deviceActions}>
          {!settingsOpen && <IconButton label="显示右侧边栏" onClick={onShowSettings}><PanelRightOpen size={16} /></IconButton>}
          <IconButton label="桌面预览" data-active={device === 'desktop'} onClick={() => onDeviceChange('desktop')}><Monitor size={16} /></IconButton>
          <IconButton label="手机预览" data-active={device === 'mobile'} onClick={() => onDeviceChange('mobile')}><Smartphone size={16} /></IconButton>
          <IconButton label="预览更多操作"><MoreHorizontal size={18} /></IconButton>
        </div>
      </header>
      <div className={styles.canvas}>
        <ScrollArea>
          <article ref={articleRef} className={styles.article}>
            <MarkdownRenderer markdown={markdown} />
          </article>
        </ScrollArea>
      </div>
    </section>
  )
}
