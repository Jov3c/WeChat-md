import { FilePlus2, LayoutTemplate } from 'lucide-react'
import type { ArticleContentTemplate } from '../../features/templates/templatePresets'
import { Button, Card, Dialog } from '../ui'
import styles from './NewArticleDialog.module.css'

interface NewArticleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: ArticleContentTemplate[]
  onBlank: () => void
  onTemplateSelect: (templateId: string) => void
}

export function NewArticleDialog({ open, onOpenChange, templates, onBlank, onTemplateSelect }: NewArticleDialogProps) {
  const chooseBlank = () => {
    onBlank()
    onOpenChange(false)
  }

  const chooseTemplate = (templateId: string) => {
    onTemplateSelect(templateId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="新建文章">
      <div className={styles.content}>
        <p className={styles.intro}>从空白文章开始，或选择一个模板快速建立正文结构。</p>
        <div className={styles.grid}>
          <Card className={`${styles.card} ${styles.blankCard}`}>
            <div className={styles.icon}><FilePlus2 size={18} /></div>
            <div className={styles.cardText}>
              <h3>空白文章</h3>
              <p>创建一篇没有预设正文的新文章。</p>
            </div>
            <Button variant="primary" onClick={chooseBlank}>新建空白文章</Button>
          </Card>
          {templates.map((template) => (
            <Card className={styles.card} key={template.id}>
              <div className={styles.icon}><LayoutTemplate size={18} /></div>
              <div className={styles.cardText}>
                <h3>{template.name}</h3>
                <p>{template.description}</p>
              </div>
              <Button onClick={() => chooseTemplate(template.id)}>使用 {template.name}</Button>
            </Card>
          ))}
        </div>
      </div>
    </Dialog>
  )
}
