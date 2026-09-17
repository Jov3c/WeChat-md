import {
  CheckCircle2,
  ChevronDown,
  Clipboard,
  FileInput,
  FilePlus2,
  MoreHorizontal,
  Settings2,
} from 'lucide-react'
import { builtInStylePresets, type StylePreset } from '../../features/styles/stylePresets'
import { builtInLayouts, type ArticleLayout, type ArticleLayoutId } from '../../features/layouts/articleLayouts'
import { builtInContentTemplates, type ArticleContentTemplate } from '../../features/templates/templatePresets'
import { Button, Divider, DropdownMenu, IconButton, Tooltip } from '../ui'
import styles from './AppChrome.module.css'

export interface ToolbarProps {
  onNewArticle: () => void
  onImport: () => void
  onExtract: () => void
  onCopy: () => void
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error'
  savedAt?: Date
  styles?: StylePreset[]
  activeStyleId?: string
  onStyleSelect?: (id: string) => void
  onManageStyles?: () => void
  layouts?: ArticleLayout[]
  activeLayoutId?: ArticleLayoutId
  onLayoutSelect?: (layoutId: ArticleLayoutId) => void
  contentTemplates?: ArticleContentTemplate[]
  onContentTemplateSelect?: (templateId: string) => void
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
  styles: availableStyles = builtInStylePresets,
  activeStyleId = 'default',
  onStyleSelect = () => undefined,
  onManageStyles = () => undefined,
  layouts: availableLayouts = builtInLayouts,
  activeLayoutId = 'standard',
  onLayoutSelect = () => undefined,
  contentTemplates: availableTemplates = builtInContentTemplates,
  onContentTemplateSelect = () => undefined,
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
  const styleItems = [...availableStyles.map((preset) => ({
    id: preset.id,
    label: `${preset.id === activeStyleId ? '✓ ' : ''}${preset.name}`,
    onSelect: () => onStyleSelect(preset.id),
  })), { id: 'manage-styles', label: '管理风格', separatorBefore: true, onSelect: onManageStyles }]
  const templateItems = [
    ...availableTemplates.map((template) => ({
      id: template.id,
      label: template.name,
      onSelect: () => onContentTemplateSelect(template.id),
    })),
    { id: 'save-template', label: '保存当前为模板', separatorBefore: true, onSelect: onSaveCurrentTemplate },
    { id: 'manage-templates', label: '管理模板', onSelect: onManageTemplates },
  ]
  const layoutItems = availableLayouts.map((layout) => ({
    id: layout.id,
    label: `${layout.id === activeLayoutId ? '✓ ' : ''}${layout.name}`,
    onSelect: () => onLayoutSelect(layout.id),
  }))

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
          trigger={<Button>版式 <ChevronDown className={styles.buttonChevron} size={14} /></Button>}
          items={layoutItems}
        />
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
            { id: 'restore-workspace', label: '恢复备份', onSelect: onRestoreBackup },
            { id: 'more-styles', label: '管理风格', onSelect: onManageStyles },
            { id: 'more-templates', label: '管理模板', onSelect: onManageTemplates },
          ]}
        />
      </div>
    </div>
  )
}
