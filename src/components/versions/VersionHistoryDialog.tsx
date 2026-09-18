import { ArrowLeft, Clock3, Eye, History, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ArticleVersion, ArticleVersionReason } from '../../features/versions/articleVersions'
import { createLineDiff } from '../../features/versions/articleDiff'
import type { StylePreset } from '../../features/styles/stylePresets'
import { Button, Dialog } from '../ui'
import styles from './VersionHistoryDialog.module.css'

interface VersionHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  versions: ArticleVersion[]
  currentArticle: { title: string; content: string; styleId?: string; styleSnapshot?: StylePreset }
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

export function VersionHistoryDialog({ open, onOpenChange, versions, currentArticle, onSaveCurrent, onRestore }: VersionHistoryDialogProps) {
  const [restoreTarget, setRestoreTarget] = useState<ArticleVersion>()
  const [compareTarget, setCompareTarget] = useState<ArticleVersion>()
  const diffLines = useMemo(() => compareTarget ? createLineDiff(compareTarget.content, currentArticle.content) : [], [compareTarget, currentArticle.content])
  const styleChanged = compareTarget !== undefined && (
    compareTarget.styleId !== currentArticle.styleId
    || (compareTarget.styleSnapshot !== undefined
      && currentArticle.styleSnapshot !== undefined
      && JSON.stringify(compareTarget.styleSnapshot) !== JSON.stringify(currentArticle.styleSnapshot))
  )
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) compareTarget && setCompareTarget(undefined)
    onOpenChange(nextOpen)
  }
  const confirmRestore = () => {
    if (!restoreTarget) return
    onRestore(restoreTarget.id)
    setRestoreTarget(undefined)
    handleOpenChange(false)
  }

  return <>
    <Dialog open={open} onOpenChange={handleOpenChange} title={compareTarget ? '版本差异' : '版本历史'} contentClassName={styles.dialog}>
      {compareTarget ? <div className={styles.diffView}>
        <div className={styles.diffHeader}>
          <Button aria-label="返回版本列表" onClick={() => setCompareTarget(undefined)}><ArrowLeft size={14} /> 返回</Button>
          <span>{formatVersionTime(compareTarget.createdAt)} · {reasonLabels[compareTarget.reason]}</span>
        </div>
        <div className={styles.changeSummary}>
          <span data-changed={compareTarget.title !== currentArticle.title}>{compareTarget.title !== currentArticle.title ? '标题已变化' : '标题未变化'}</span>
          <span data-changed={styleChanged}>{styleChanged ? '排版风格已变化' : '排版风格未变化'}</span>
        </div>
        {compareTarget.title !== currentArticle.title ? <div className={styles.titleChange}><del>{compareTarget.title}</del><span>→</span><ins>{currentArticle.title}</ins></div> : null}
        {diffLines.length > 0 ? <div className={styles.diffTable} aria-label="正文差异">
          {diffLines.map((line, index) => <div className={styles.diffLine} data-kind={line.kind} key={`${line.kind}-${line.oldLine ?? '-'}-${line.newLine ?? '-'}-${index}`}>
            <span className={styles.lineNumber}>{line.oldLine ?? ''}</span>
            <span className={styles.lineNumber}>{line.newLine ?? ''}</span>
            <span className={styles.diffMark}>{line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ''}</span>
            <code>{line.text || ' '}</code>
          </div>)}
        </div> : <div className={styles.noChanges}><strong>没有正文变化</strong><span>这个版本的正文与当前文章相同。</span></div>}
        <div className={styles.diffActions}><Button onClick={() => setRestoreTarget(compareTarget)}>恢复这个版本</Button></div>
      </div> : <div className={styles.history}>
        <div className={styles.summary}>
          <div><History size={17} /><span>自动留档间隔 10 分钟，每篇最多保留 50 个版本。</span></div>
          <Button variant="primary" onClick={onSaveCurrent}><Save size={14} /> 保存当前版本</Button>
        </div>
        <div className={styles.list}>
          {versions.map((version) => <article className={styles.item} key={version.id}>
            <span className={styles.dot} aria-hidden="true" />
            <div className={styles.info}><strong>{version.title}</strong><span><Clock3 size={12} /> {formatVersionTime(version.createdAt)} · {reasonLabels[version.reason]}</span><p>{version.content.replace(/[#>*_`\n-]+/g, ' ').trim().slice(0, 80) || '空白内容'}</p></div>
            <div className={styles.itemActions}>
              <Button aria-label={`查看版本变化 ${version.title}`} onClick={() => setCompareTarget(version)}><Eye size={14} /> 查看变化</Button>
              <Button aria-label={`恢复版本 ${version.title}`} onClick={() => setRestoreTarget(version)}>恢复</Button>
            </div>
          </article>)}
          {versions.length === 0 ? <div className={styles.empty}><History size={23} /><strong>还没有历史版本</strong><span>继续编辑，或手动保存当前版本。</span></div> : null}
        </div>
      </div>}
    </Dialog>
    <Dialog open={restoreTarget !== undefined} onOpenChange={(next) => { if (!next) setRestoreTarget(undefined) }} title="恢复这个版本？">
      <div className={styles.confirm}>
        <p>恢复前会先保存当前内容，之后仍可从版本历史中找回。</p>
        <div><Button onClick={() => setRestoreTarget(undefined)}>取消</Button><Button variant="primary" onClick={confirmRestore}>确认恢复</Button></div>
      </div>
    </Dialog>
  </>
}
