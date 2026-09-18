import {
  CheckCircle2,
  ChevronDown,
  Clipboard,
  FileInput,
  FilePlus2,
  MoreHorizontal,
  Settings2,
} from 'lucide-react'
import { builtInArticleStyleProfiles, type ArticleStyleProfile } from '../../features/styles/articleStyleProfiles'
import { Button, Divider, DropdownMenu, IconButton, Tooltip } from '../ui'
import styles from './AppChrome.module.css'

export interface ToolbarProps {
  onNewArticle: () => void
  onImport: () => void
  onExtract: () => void
  onCopy: () => void
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error'
  savedAt?: Date
  articleStyles?: ArticleStyleProfile[]
  activeArticleStyleId?: string
  onArticleStyleSelect?: (id: string) => void
  onManageStyles?: () => void
  onSaveCurrentTemplate?: () => void
  onManageTemplates?: () => void
  onOpenPreviewSettings?: () => void
  onManageAssets?: () => void
  onOpenVersionHistory?: () => void
  onExportMarkdown?: () => void
  onExportHtml?: () => void
  onBackupWorkspace?: () => void
  onRestoreBackup?: () => void
}

function formatSaveStatus(saveStatus: ToolbarProps['saveStatus'], savedAt?: Date) {
  if (saveStatus === 'saving') return '保存中…'
  if (saveStatus === 'error') return '保存失败'
  if (saveStatus !== 'saved') return ''
  if (!savedAt) return '已保存'
  const hours = String(savedAt.getHours()).padStart(2, '0')
  const minutes = String(savedAt.getMinutes()).padStart(2, '0')
  return `已保存 ${hours}:${minutes}`
}

export function Toolbar({
  onNewArticle,
  onImport,
  onExtract,
  onCopy,
  saveStatus = 'idle',
  savedAt,
  articleStyles = builtInArticleStyleProfiles,
  activeArticleStyleId = 'default',
  onArticleStyleSelect = () => undefined,
  onManageStyles = () => undefined,
  onSaveCurrentTemplate = () => undefined,
  onManageTemplates = () => undefined,
  onOpenPreviewSettings = () => undefined,
  onManageAssets = () => undefined,
  onOpenVersionHistory = () => undefined,
  onExportMarkdown = () => undefined,
  onExportHtml = () => undefined,
  onBackupWorkspace = () => undefined,
  onRestoreBackup = () => undefined,
}: ToolbarProps) {
  const saveLabel = formatSaveStatus(saveStatus, savedAt)
  const styleItems = [...articleStyles.map((profile) => ({
    id: profile.id,
    label: `${profile.id === activeArticleStyleId ? '✓ ' : ''}${profile.name}`,
    onSelect: () => onArticleStyleSelect(profile.id),
  })), { id: 'manage-styles', label: '管理风格', separatorBefore: true, onSelect: onManageStyles }]

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
          trigger={<Button>风格 <ChevronDown className={styles.buttonChevron} size={14} /></Button>}
          items={styleItems}
        />
      </div>
      <div className={styles.toolbarGroup}>
        {saveLabel ? <span className={styles.saveStatus} role="status">{saveLabel}</span> : null}
        <Button onClick={onOpenPreviewSettings}><Settings2 size={16} /> 预览设置</Button>
        <Button className={styles.copyButton} variant="primary" onClick={onCopy}>
          <Clipboard size={16} /> 复制到公众号
        </Button>
        <DropdownMenu
          trigger={<IconButton label="更多操作"><MoreHorizontal size={18} /></IconButton>}
          items={[
            { id: 'more-page-settings', label: '页面设置', onSelect: onOpenPreviewSettings },
            { id: 'more-assets', label: '图片资源', onSelect: onManageAssets },
            { id: 'more-versions', label: '版本历史', onSelect: onOpenVersionHistory },
            { id: 'export-markdown', label: '导出 Markdown', separatorBefore: true, onSelect: onExportMarkdown },
            { id: 'export-html', label: '导出 HTML', onSelect: onExportHtml },
            { id: 'backup-workspace', label: '备份工作区', separatorBefore: true, onSelect: onBackupWorkspace },
            { id: 'restore-workspace', label: '恢复备份', onSelect: onRestoreBackup },
            { id: 'more-styles', label: '管理风格', onSelect: onManageStyles },
            { id: 'save-template', label: '保存当前为模板', separatorBefore: true, onSelect: onSaveCurrentTemplate },
            { id: 'more-templates', label: '管理模板', onSelect: onManageTemplates },
          ]}
        />
      </div>
    </div>
  )
}
