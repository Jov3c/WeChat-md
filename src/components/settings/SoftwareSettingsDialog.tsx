import { FolderOpen, RotateCcw } from 'lucide-react'
import { Button, Dialog } from '../ui'
import styles from './SoftwareSettingsDialog.module.css'

interface SoftwareSettingsDialogProps {
  open: boolean
  directory: string
  busy?: boolean
  onOpenChange: (open: boolean) => void
  onChooseDirectory: () => void
  onResetDirectory: () => void
  onOpenDirectory: () => void
}

export function SoftwareSettingsDialog({ open, directory, busy = false, onOpenChange, onChooseDirectory, onResetDirectory, onOpenDirectory }: SoftwareSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="软件设置" contentClassName={styles.dialog}>
      <div className={styles.content}>
        <section className={styles.section}>
          <div className={styles.heading}>
            <div><strong>公众号图片保存位置</strong><span>保存文章时，图片会同时写入本地资源库和这个文件夹。</span></div>
          </div>
          <div className={styles.path} title={directory}>{directory || '正在读取保存位置…'}</div>
          <div className={styles.actions}>
            <Button disabled={busy} onClick={onChooseDirectory}>更改位置</Button>
            <Button disabled={busy || !directory} onClick={onOpenDirectory}><FolderOpen size={15} /> 打开目录</Button>
            <Button className={styles.reset} disabled={busy} variant="ghost" onClick={onResetDirectory}><RotateCcw size={14} /> 恢复默认</Button>
          </div>
        </section>
        <p className={styles.note}>每篇公众号文章会建立独立文件夹，图片保存在其中的 images 目录，避免不同文章之间重名覆盖。</p>
      </div>
    </Dialog>
  )
}
