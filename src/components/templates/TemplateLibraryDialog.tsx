import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import type { ArticleTemplate } from '../../features/templates/templatePresets'
import { Button, Card, Dialog, DropdownMenu, IconButton, Input } from '../ui'
import styles from './TemplateLibraryDialog.module.css'

interface TemplateLibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: ArticleTemplate[]
  onRename: (templateId: string, name: string) => void
  onDelete: (templateId: string) => void
}

export function TemplateLibraryDialog({ open, onOpenChange, templates, onRename, onDelete }: TemplateLibraryDialogProps) {
  const [renameTarget, setRenameTarget] = useState<ArticleTemplate>()
  const [deleteTarget, setDeleteTarget] = useState<ArticleTemplate>()
  const [name, setName] = useState('')

  const openRename = (template: ArticleTemplate) => {
    onOpenChange(false)
    setName(template.name)
    setRenameTarget(template)
  }

  const openDelete = (template: ArticleTemplate) => {
    onOpenChange(false)
    setDeleteTarget(template)
  }

  const saveName = () => {
    if (!renameTarget || !name.trim()) return
    onRename(renameTarget.id, name.trim())
    setRenameTarget(undefined)
    onOpenChange(true)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    onDelete(deleteTarget.id)
    setDeleteTarget(undefined)
    onOpenChange(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} title="管理模板">
        <div className={styles.library}>
          <p className={styles.intro}>模板会在“新建文章”时供你选择。</p>
          <div className={styles.grid}>
            {templates.map((template) => (
              <Card className={styles.card} key={template.id}>
                <div className={styles.cardText}>
                  <div className={styles.cardTitleRow}>
                    <h3>{template.name}</h3>
                    {!template.builtIn ? (
                      <DropdownMenu
                        trigger={<IconButton label={`管理 ${template.name}`}><MoreHorizontal size={17} /></IconButton>}
                        items={[
                          { id: `rename-${template.id}`, label: '重命名模板', onSelect: () => openRename(template) },
                          { id: `delete-${template.id}`, label: '删除模板', onSelect: () => openDelete(template) },
                        ]}
                      />
                    ) : null}
                  </div>
                  <p>{template.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Dialog>
      <Dialog open={renameTarget !== undefined} onOpenChange={(nextOpen) => { if (!nextOpen) { setRenameTarget(undefined); onOpenChange(true) } }} title="重命名模板">
        <div className={styles.form}>
          <label><span>模板名称</span><Input aria-label="模板名称" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <div><Button onClick={() => { setRenameTarget(undefined); onOpenChange(true) }}>取消</Button><Button variant="primary" disabled={!name.trim()} onClick={saveName}>保存名称</Button></div>
        </div>
      </Dialog>
      <Dialog open={deleteTarget !== undefined} onOpenChange={(nextOpen) => { if (!nextOpen) { setDeleteTarget(undefined); onOpenChange(true) } }} title="删除模板">
        <div className={styles.form}>
          <p>删除“{deleteTarget?.name}”后无法恢复，已创建的文章不会受影响。</p>
          <div><Button onClick={() => { setDeleteTarget(undefined); onOpenChange(true) }}>取消</Button><Button variant="primary" onClick={confirmDelete}>确认删除</Button></div>
        </div>
      </Dialog>
    </>
  )
}
