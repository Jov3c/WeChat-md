import { Clock3, History, Save } from 'lucide-react'
import { useState } from 'react'
import type { ArticleVersion, ArticleVersionReason } from '../../features/versions/articleVersions'
import { Button, Dialog } from '../ui'
import styles from './VersionHistoryDialog.module.css'

interface VersionHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  versions: ArticleVersion[]
  onSaveCurrent: () => void
  onRestore: (versionId: string) => void
}

const reasonLabels: Record<ArticleVersionReason, string> = {
  automatic: '自动留档', manual: '手动保存', safety: '安全留档', restore: '恢复前留档',
}

function formatVersionTime(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}

export function VersionHistoryDialog({ open, onOpenChange, versions, onSaveCurrent, onRestore }: VersionHistoryDialogProps) {
  const [restoreTarget, setRestoreTarget] = useState<ArticleVersion>()
  const confirmRestore = () => {
    if (!restoreTarget) return
    onRestore(restoreTarget.id)
    setRestoreTarget(undefined)
    onOpenChange(false)
  }

  return <>
    <Dialog open={open} onOpenChange={onOpenChange} title="版本历史" contentClassName={styles.dialog}>
      <div className={styles.history}>
        <div className={styles.summary}>
          <div><History size={17} /><span>自动留档间隔 10 分钟，每篇最多保留 50 个版本。</span></div>
          <Button variant="primary" onClick={onSaveCurrent}><Save size={14} /> 保存当前版本</Button>
        </div>
        <div className={styles.list}>
          {versions.map((version) => <article className={styles.item} key={version.id}>
            <span className={styles.dot} aria-hidden="true" />
            <div className={styles.info}><strong>{version.title}</strong><span><Clock3 size={12} /> {formatVersionTime(version.createdAt)} · {reasonLabels[version.reason]}</span><p>{version.content.replace(/[#>*_`\n-]+/g, ' ').trim().slice(0, 80) || '空白内容'}</p></div>
            <Button aria-label={`恢复版本 ${version.title}`} onClick={() => setRestoreTarget(version)}>恢复</Button>
          </article>)}
          {versions.length === 0 ? <div className={styles.empty}><History size={23} /><strong>还没有历史版本</strong><span>继续编辑，或手动保存当前版本。</span></div> : null}
        </div>
      </div>
    </Dialog>
    <Dialog open={restoreTarget !== undefined} onOpenChange={(next) => { if (!next) setRestoreTarget(undefined) }} title="恢复这个版本？">
      <div className={styles.confirm}>
        <p>恢复前会先保存当前内容，之后仍可从版本历史中找回。</p>
        <div><Button onClick={() => setRestoreTarget(undefined)}>取消</Button><Button variant="primary" onClick={confirmRestore}>确认恢复</Button></div>
      </div>
    </Dialog>
  </>
}
