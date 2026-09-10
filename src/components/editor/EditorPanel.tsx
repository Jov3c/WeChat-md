import { Maximize2 } from 'lucide-react'
import { IconButton, Tabs } from '../ui'
import styles from './EditorPanel.module.css'

export interface EditorPanelProps {
  value: string
  onChange: (value: string) => void
  tab: string
  onTabChange: (tab: string) => void
}

export function EditorPanel({ value, onChange, tab, onTabChange }: EditorPanelProps) {
  const lineCount = Math.max(30, value.split('\n').length)
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
          className={styles.textarea}
          aria-label="Markdown 内容"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </section>
  )
}
