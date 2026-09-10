import {
  CheckCircle2,
  ChevronDown,
  Clipboard,
  FileInput,
  FilePlus2,
  MoreHorizontal,
  Settings2,
} from 'lucide-react'
import { Button, Divider, DropdownMenu, IconButton, Tooltip } from '../ui'
import styles from './AppChrome.module.css'

export interface ToolbarProps {
  onNewArticle: () => void
  onImport: () => void
  onExtract: () => void
  onCopy: () => void
}

const templateItems = [
  { id: 'blank', label: '空白文章', onSelect: () => undefined },
  { id: 'tutorial', label: '教程文章', onSelect: () => undefined },
]

const styleItems = [
  { id: 'default', label: '默认 · 简洁', onSelect: () => undefined },
  { id: 'warm', label: '暖色 · 阅读', onSelect: () => undefined },
]

export function Toolbar({ onNewArticle, onImport, onExtract, onCopy }: ToolbarProps) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="文章操作">
      <div className={styles.toolbarGroup}>
        <Button className={styles.newButton} variant="primary" onClick={onNewArticle}>
          <FilePlus2 size={17} /> 新建文章
        </Button>
        <Button onClick={onImport}><FileInput size={16} /> 导入 MD</Button>
        <Button onClick={onExtract}><CheckCircle2 size={16} /> 提取公众号</Button>
        <Divider />
        <DropdownMenu
          trigger={<Button>模板 <ChevronDown className={styles.buttonChevron} size={14} /></Button>}
          items={templateItems}
        />
        <DropdownMenu
          trigger={<Button>风格 <ChevronDown className={styles.buttonChevron} size={14} /></Button>}
          items={styleItems}
        />
      </div>
      <div className={styles.toolbarGroup}>
        <Button><Settings2 size={16} /> 预览设置</Button>
        <Button className={styles.copyButton} variant="primary" onClick={onCopy}>
          <Clipboard size={16} /> 复制到公众号
        </Button>
        <Tooltip content="更多操作">
          <IconButton label="更多操作"><MoreHorizontal size={18} /></IconButton>
        </Tooltip>
      </div>
    </div>
  )
}
