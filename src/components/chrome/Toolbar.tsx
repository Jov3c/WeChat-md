import {
  CheckCircle2,
  ChevronDown,
  Clipboard,
  FileInput,
  FilePlus2,
  MoreHorizontal,
  Settings2,
} from 'lucide-react'
import { useRef } from 'react'
import { builtInStylePresets, type StylePreset } from '../../features/styles/stylePresets'
import { builtInTemplates, type ArticleTemplate } from '../../features/templates/templatePresets'
import { Button, Divider, DropdownMenu, IconButton, Tooltip } from '../ui'
import styles from './AppChrome.module.css'

export interface ToolbarProps {
  onNewArticle: () => void
  onImport: (file: File) => void
  onExtract: () => void
  onCopy: () => void
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error'
  savedAt?: Date
  styles?: StylePreset[]
  activeStyleId?: string
  onStyleSelect?: (id: string) => void
  onManageStyles?: () => void
  templates?: ArticleTemplate[]
  onTemplateSelect?: (templateId: string) => void
  onSaveCurrentTemplate?: () => void
  onManageTemplates?: () => void
  onOpenPreviewSettings?: () => void
  onManageAssets?: () => void
  onOpenVersionHistory?: () => void
  onExportMarkdown?: () => void
  onExportHtml?: () => void
  onBackupWorkspace?: () => void
  onRestoreBackup?: (file: File) => void
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
  styles: availableStyles = builtInStylePresets,
  activeStyleId = 'default',
  onStyleSelect = () => undefined,
  onManageStyles = () => undefined,
  templates: availableTemplates = builtInTemplates,
  onTemplateSelect = () => undefined,
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const backupInputRef = useRef<HTMLInputElement>(null)
  const saveLabel = formatSaveStatus(saveStatus, savedAt)
  const styleItems = [...availableStyles.map((preset) => ({
    id: preset.id,
    label: `${preset.id === activeStyleId ? '✓ ' : ''}${preset.name}`,
    onSelect: () => onStyleSelect(preset.id),
  })), { id: 'manage-styles', label: '管理风格', separatorBefore: true, onSelect: onManageStyles }]
  const templateItems = [
    ...availableTemplates.map((template) => ({
      id: template.id,
      label: template.name,
      onSelect: () => onTemplateSelect(template.id),
    })),
    { id: 'save-template', label: '保存当前为模板', separatorBefore: true, onSelect: onSaveCurrentTemplate },
    { id: 'manage-templates', label: '管理模板', onSelect: onManageTemplates },
  ]

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="文章操作">
      <div className={styles.toolbarGroup}>
        <Button className={styles.newButton} variant="primary" onClick={onNewArticle}>
          <FilePlus2 size={17} /> 新建文章
        </Button>
        <Button onClick={() => fileInputRef.current?.click()}><FileInput size={16} /> 导入 MD</Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          aria-label="选择 Markdown 文件"
          hidden
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            if (file) onImport(file)
            event.currentTarget.value = ''
          }}
        />
        <input
          ref={backupInputRef}
          type="file"
          accept=".wechatmd,application/x-wechatmd,application/zip"
          aria-label="选择 WeChat-md 备份"
          hidden
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            if (file) onRestoreBackup(file)
            event.currentTarget.value = ''
          }}
        />
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
            { id: 'restore-workspace', label: '恢复备份', onSelect: () => backupInputRef.current?.click() },
            { id: 'more-styles', label: '管理风格', onSelect: onManageStyles },
            { id: 'more-templates', label: '管理模板', onSelect: onManageTemplates },
          ]}
        />
      </div>
    </div>
  )
}
