import { ImagePlus, Link2, Trash2, Unlink } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ImageAsset } from '../../features/assets/assetRepository'
import { Button, Dialog, Input } from '../ui'
import styles from './AssetLibraryDialog.module.css'

interface AssetLibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assets: ImageAsset[]
  assetUrls: Record<string, string>
  currentArticleIds: string[]
  onInsert: (id: string) => void
  onImportFiles: (files: File[]) => void
  onImportUrl: (url: string) => void
  onRemoveFromArticle: (id: string) => void
  onDelete: (id: string) => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function AssetLibraryDialog({ open, onOpenChange, assets, assetUrls, currentArticleIds, onInsert, onImportFiles, onImportUrl, onRemoveFromArticle, onDelete }: AssetLibraryDialogProps) {
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const currentIds = new Set(currentArticleIds)
  const submitUrl = () => {
    if (!url.trim()) return
    onImportUrl(url.trim())
    setUrl('')
  }

  return <Dialog open={open} onOpenChange={onOpenChange} title="图片资源" contentClassName={styles.dialog}>
    <div className={styles.library}>
      <div className={styles.importBar}>
        <Button onClick={() => inputRef.current?.click()}><ImagePlus size={15} /> 上传图片</Button>
        <input ref={inputRef} hidden multiple type="file" accept="image/*" aria-label="从电脑选择图片" onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? [])
          if (files.length) onImportFiles(files)
          event.currentTarget.value = ''
        }} />
        <div className={styles.urlField}><Link2 size={15} /><Input aria-label="网络图片地址" placeholder="粘贴图片链接" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitUrl() }} /></div>
        <Button variant="primary" disabled={!url.trim()} onClick={submitUrl}>下载并插入</Button>
      </div>
      <p className={styles.hint}>图片保存在本地资源库；从正文移除后会进入“未使用”，不会立刻删除原文件。</p>
      <div className={styles.grid}>
        {assets.map((asset) => {
          const used = currentIds.has(asset.id)
          const usedElsewhere = !used && !asset.unused
          return <article className={styles.card} key={asset.id}>
            <div className={styles.thumb}>{assetUrls[asset.id] ? <img src={assetUrls[asset.id]} alt="" /> : <ImagePlus size={22} />}</div>
            <div className={styles.info}><strong title={asset.name}>{asset.name}</strong><span>{formatBytes(asset.size)} · {used ? '正文使用中' : usedElsewhere ? '其他文章使用' : '未使用'}</span></div>
            <div className={styles.actions}>
              {used ? <Button aria-label={`从正文移除 ${asset.name}`} onClick={() => onRemoveFromArticle(asset.id)}><Unlink size={14} /> 移除</Button> : <Button aria-label={`插入 ${asset.name}`} onClick={() => onInsert(asset.id)}>插入</Button>}
              {!used && !usedElsewhere ? <Button aria-label={`永久删除 ${asset.name}`} onClick={() => onDelete(asset.id)}><Trash2 size={14} /></Button> : null}
            </div>
          </article>
        })}
        {assets.length === 0 ? <div className={styles.empty}><ImagePlus size={24} /><strong>还没有图片</strong><span>上传、粘贴或拖入图片后会出现在这里。</span></div> : null}
      </div>
    </div>
  </Dialog>
}
