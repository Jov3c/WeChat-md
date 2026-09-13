import { ArrowLeft } from 'lucide-react'
import type { StylePreset, StyleValuePath } from '../../features/styles/stylePresets'
import { Button, IconButton, Switch } from '../ui'
import styles from './SettingsPanel.module.css'

type EditableValue = string | number | boolean
export type StyleEditorSection = 'global' | 'headings' | 'paragraph' | 'quote' | 'code' | 'list' | 'table' | 'image' | 'divider' | 'link' | 'misc'
type Field = {
  label: string
  path: StyleValuePath
  kind?: 'number' | 'color' | 'select' | 'toggle'
  min?: number
  max?: number
  step?: number
  options?: Array<{ label: string; value: string | number }>
}

const globalFields: Field[] = [
  { label: '主题色', path: 'global.accentColor', kind: 'color' },
  { label: '正文颜色', path: 'global.textColor', kind: 'color' },
  { label: '字体', path: 'global.fontFamily', kind: 'select', options: [{ label: '系统字体', value: 'system-ui' }, { label: '宋体', value: 'serif' }, { label: '等宽字体', value: 'monospace' }] },
  { label: '字号', path: 'global.fontSize', kind: 'number', min: 12, max: 24 },
  { label: '行高', path: 'global.lineHeight', kind: 'number', min: 1.2, max: 2.5, step: 0.05 },
  { label: '字间距', path: 'global.letterSpacing', kind: 'number', min: -1, max: 8, step: 0.1 },
  { label: '段间距', path: 'global.paragraphSpacing', kind: 'number', min: 0, max: 64 },
  { label: '背景色', path: 'global.backgroundColor', kind: 'color' },
  { label: '内容宽度', path: 'global.contentWidth', kind: 'number', min: 520, max: 900 },
]

const headingFields = (level: 'h1' | 'h2' | 'h3'): Field[] => {
  const prefix = level.toUpperCase()
  const path = (name: string) => `headings.${level}.${name}` as StyleValuePath
  return [
    { label: `${prefix} 字号`, path: path('fontSize'), kind: 'number', min: 12, max: 64 },
    { label: `${prefix} 字重`, path: path('fontWeight'), kind: 'select', options: [400, 500, 600, 700, 800, 900].map((value) => ({ label: String(value), value })) },
    { label: `${prefix} 颜色`, path: path('color'), kind: 'color' },
    { label: `${prefix} 上间距`, path: path('marginTop'), kind: 'number', min: 0, max: 80 },
    { label: `${prefix} 下间距`, path: path('marginBottom'), kind: 'number', min: 0, max: 80 },
    { label: `${prefix} 对齐`, path: path('textAlign'), kind: 'select', options: [{ label: '左对齐', value: 'left' }, { label: '居中', value: 'center' }, { label: '右对齐', value: 'right' }] },
    { label: `${prefix} 自动编号`, path: path('numbered'), kind: 'toggle' },
    { label: `${prefix} 下划线`, path: path('underline'), kind: 'toggle' },
    { label: `${prefix} 左侧线`, path: path('leftBar'), kind: 'toggle' },
    { label: `${prefix} 背景色`, path: path('backgroundColor'), kind: 'color' },
    { label: `${prefix} 边框色`, path: path('borderColor'), kind: 'color' },
    { label: `${prefix} 圆角`, path: path('borderRadius'), kind: 'number', min: 0, max: 32 },
  ]
}

const componentFields: Record<string, Field[]> = {
  paragraph: [
    { label: '正文颜色', path: 'components.paragraph.color', kind: 'color' },
    { label: '首行缩进', path: 'components.paragraph.indent', kind: 'number', min: 0, max: 4, step: 0.5 },
  ],
  quote: [
    { label: '背景色', path: 'components.quote.backgroundColor', kind: 'color' },
    { label: '边框色', path: 'components.quote.borderColor', kind: 'color' },
    { label: '文字颜色', path: 'components.quote.color', kind: 'color' },
    { label: '圆角', path: 'components.quote.borderRadius', kind: 'number', min: 0, max: 32 },
  ],
  code: [
    { label: '行内代码背景', path: 'components.inlineCode.backgroundColor', kind: 'color' },
    { label: '行内代码颜色', path: 'components.inlineCode.color', kind: 'color' },
    { label: '行内代码圆角', path: 'components.inlineCode.borderRadius', kind: 'number', min: 0, max: 16 },
    { label: '代码块背景', path: 'components.codeBlock.backgroundColor', kind: 'color' },
    { label: '代码块颜色', path: 'components.codeBlock.color', kind: 'color' },
    { label: '代码块边框', path: 'components.codeBlock.borderColor', kind: 'color' },
    { label: '代码块圆角', path: 'components.codeBlock.borderRadius', kind: 'number', min: 0, max: 32 },
    { label: '代码块字号', path: 'components.codeBlock.fontSize', kind: 'number', min: 10, max: 24 },
  ],
  list: [
    { label: '标记颜色', path: 'components.list.markerColor', kind: 'color' },
    { label: '列表缩进', path: 'components.list.indent', kind: 'number', min: 0, max: 60 },
    { label: '条目间距', path: 'components.list.itemSpacing', kind: 'number', min: 0, max: 32 },
  ],
  table: [
    { label: '表头背景', path: 'components.table.headerBackground', kind: 'color' },
    { label: '边框颜色', path: 'components.table.borderColor', kind: 'color' },
    { label: '表格圆角', path: 'components.table.borderRadius', kind: 'number', min: 0, max: 24 },
  ],
  image: [
    { label: '图片圆角', path: 'components.image.borderRadius', kind: 'number', min: 0, max: 40 },
    { label: '图片阴影', path: 'components.image.shadow', kind: 'toggle' },
    { label: '说明文字颜色', path: 'components.image.captionColor', kind: 'color' },
  ],
  divider: [
    { label: '分割线颜色', path: 'components.divider.color', kind: 'color' },
    { label: '分割线粗细', path: 'components.divider.thickness', kind: 'number', min: 1, max: 8 },
    { label: '上下间距', path: 'components.divider.margin', kind: 'number', min: 0, max: 64 },
  ],
  link: [
    { label: '链接颜色', path: 'components.link.color', kind: 'color' },
    { label: '显示下划线', path: 'components.link.underline', kind: 'toggle' },
  ],
  misc: [
    { label: '粗体颜色', path: 'components.strong.color', kind: 'color' },
  ],
}

function readValue(preset: StylePreset, path: StyleValuePath): EditableValue {
  return path.split('.').reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], preset) as EditableValue
}

function FieldControl({ field, preset, onChange }: { field: Field; preset: StylePreset; onChange: (path: StyleValuePath, value: EditableValue) => void }) {
  const value = readValue(preset, field.path)
  if (field.kind === 'toggle') {
    return <Switch label={field.label} checked={Boolean(value)} onCheckedChange={(checked) => onChange(field.path, checked)} />
  }
  if (field.kind === 'select') {
    return (
      <select aria-label={field.label} value={String(value)} onChange={(event) => {
        const selected = field.options?.find((option) => String(option.value) === event.target.value)?.value ?? event.target.value
        onChange(field.path, selected)
      }}>
        {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    )
  }
  return (
    <input
      aria-label={field.label}
      type={field.kind === 'color' && String(value) !== 'transparent' ? 'color' : field.kind === 'color' ? 'text' : 'number'}
      value={String(value)}
      min={field.min}
      max={field.max}
      step={field.step}
      onChange={(event) => onChange(field.path, field.kind === 'number' ? Number(event.target.value) : event.target.value)}
    />
  )
}

const sectionTitles: Record<StyleEditorSection, string> = {
  global: '全局设置', headings: '标题样式', paragraph: '正文样式', quote: '引用样式', code: '代码样式',
  list: '列表样式', table: '表格样式', image: '图片样式', divider: '分割线样式', link: '链接样式',
  misc: '其他样式',
}

export function StyleEditor({ section, preset, dirty, onChange, onDiscard, onSave, onBack }: {
  section: StyleEditorSection
  preset: StylePreset
  dirty: boolean
  onChange: (path: StyleValuePath, value: EditableValue) => void
  onDiscard: () => void
  onSave: () => void
  onBack: () => void
}) {
  const groups = section === 'headings'
    ? ([['H1', headingFields('h1')], ['H2', headingFields('h2')], ['H3', headingFields('h3')]] as Array<[string, Field[]]>)
    : [[sectionTitles[section], section === 'global' ? globalFields : componentFields[section]] as [string, Field[]]]

  return (
    <div className={styles.editorContent} role="region" aria-label={`${sectionTitles[section]}编辑`}>
      <div className={styles.editorTitle}>
        <IconButton label="返回排版设置" onClick={onBack}><ArrowLeft size={16} /></IconButton>
        <div><h3>{sectionTitles[section]}</h3><p>修改即时应用到当前文章</p></div>
      </div>
      {groups.map(([title, fields]) => (
        <fieldset className={styles.fieldGroup} key={title}>
          <legend>{title}</legend>
          {fields.map((field) => (
            <label className={styles.fieldRow} key={field.path}>
              <span>{field.label}</span>
              <FieldControl field={field} preset={preset} onChange={onChange} />
            </label>
          ))}
        </fieldset>
      ))}
      {dirty ? (
        <div className={styles.styleSaveBar} role="region" aria-label="未保存的风格修改">
          <span>有未保存的修改</span>
          <div><Button size="sm" onClick={onDiscard}>撤销</Button><Button size="sm" variant="primary" onClick={onSave}>{preset.builtIn ? '另存并应用' : '保存并应用'}</Button></div>
        </div>
      ) : null}
    </div>
  )
}
