import { useEffect, useState } from 'react'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, CirclePlus, Code2, Image, Link2, List, Minus, MoreHorizontal, PanelRightClose, PanelTop, Quote, Settings2, Table2, Type } from 'lucide-react'
import { builtInStylePresets, type StylePreset, type StyleValuePath } from '../../features/styles/stylePresets'
import { builtInContentComponents, type ContentComponent } from '../../features/components/contentComponents'
import { Button, Card, Dialog, DropdownMenu, IconButton, Input, Slider, Tabs } from '../ui'
import { StyleEditor, type StyleEditorSection } from './StyleEditor'
import styles from './SettingsPanel.module.css'

type EditableValue = string | number | boolean
type ComponentCategory = 'common' | 'structure' | 'ending' | 'custom'

const componentCategories: Array<{ id: ComponentCategory; label: string }> = [
  { id: 'common', label: '常用' },
  { id: 'structure', label: '结构' },
  { id: 'ending', label: '文末' },
  { id: 'custom', label: '我的' },
]

const componentCategoryIds: Record<Exclude<ComponentCategory, 'custom'>, string[]> = {
  common: ['info', 'highlight', 'steps', 'image'],
  structure: ['section', 'code'],
  ending: ['signature', 'follow'],
}

export interface SettingsPanelProps {
  tab: string
  onTabChange: (tab: string) => void
  pageWidth: number[]
  onPageWidthChange: (value: number[]) => void
  onClose: () => void
  open: boolean
  stylePreset?: StylePreset
  styles?: StylePreset[]
  activeStyleId?: string
  libraryRequest?: number
  styleDirty?: boolean
  onStyleValueChange?: (path: StyleValuePath, value: EditableValue) => void
  onStyleSelect?: (id: string) => void
  onDiscardStyleChanges?: () => void
  onSaveStyle?: (name?: string) => void
  onRenameStyle?: (id: string, name: string) => void
  onDeleteStyle?: (id: string) => void
  onResetStyle?: (id: string) => void
  components?: ContentComponent[]
  selectedText?: string
  onInsertComponent?: (id: string) => void
  onSaveComponent?: (name: string) => void
  onRenameComponent?: (id: string, name: string) => void
  onDeleteComponent?: (id: string) => void
  wechatArticleSavePolicy?: 'ask' | 'always' | 'never'
  onWechatArticleSavePolicyChange?: (policy: 'ask' | 'always' | 'never') => void
}

const layoutSettings: Array<{ label: string; icon: typeof Settings2; section: StyleEditorSection }> = [
  { label: '全局设置', icon: Settings2, section: 'global' },
  { label: '标题样式', icon: Type, section: 'headings' },
  { label: '正文样式', icon: PanelTop, section: 'paragraph' },
  { label: '引用样式', icon: Quote, section: 'quote' },
  { label: '代码样式', icon: Code2, section: 'code' },
  { label: '列表样式', icon: List, section: 'list' },
  { label: '表格样式', icon: Table2, section: 'table' },
  { label: '图片样式', icon: Image, section: 'image' },
  { label: '分割线样式', icon: Minus, section: 'divider' },
  { label: '链接样式', icon: Link2, section: 'link' },
  { label: '其他样式', icon: CirclePlus, section: 'misc' },
]

export function SettingsPanel({
  tab,
  onTabChange,
  pageWidth,
  onPageWidthChange,
  onClose,
  open,
  stylePreset = builtInStylePresets[0],
  styles: availableStyles = builtInStylePresets,
  activeStyleId = 'default',
  libraryRequest = 0,
  styleDirty = false,
  onStyleValueChange = () => undefined,
  onStyleSelect = () => undefined,
  onDiscardStyleChanges = () => undefined,
  onSaveStyle = () => undefined,
  onRenameStyle = () => undefined,
  onDeleteStyle = () => undefined,
  onResetStyle = () => undefined,
  components: availableComponents = builtInContentComponents,
  selectedText = '',
  onInsertComponent = () => undefined,
  onSaveComponent = () => undefined,
  onRenameComponent = () => undefined,
  onDeleteComponent = () => undefined,
  wechatArticleSavePolicy = 'ask',
  onWechatArticleSavePolicyChange = () => undefined,
}: SettingsPanelProps) {
  const [section, setSection] = useState<StyleEditorSection | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [styleName, setStyleName] = useState('')
  const [renameTarget, setRenameTarget] = useState<StylePreset | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StylePreset | null>(null)
  const [componentSaveOpen, setComponentSaveOpen] = useState(false)
  const [componentName, setComponentName] = useState('')
  const [componentRenameTarget, setComponentRenameTarget] = useState<ContentComponent | null>(null)
  const [componentDeleteTarget, setComponentDeleteTarget] = useState<ContentComponent | null>(null)
  const [componentCategory, setComponentCategory] = useState<ComponentCategory>('common')
  const [componentPage, setComponentPage] = useState(0)

  useEffect(() => { setSection(null); setLibraryOpen(false) }, [tab])
  useEffect(() => { if (libraryRequest > 0) { setSection(null); setLibraryOpen(true) } }, [libraryRequest])

  const filteredComponents = availableComponents.filter((component) => componentCategory === 'custom'
    ? !component.builtIn
    : componentCategoryIds[componentCategory].includes(component.id))
  const componentPageCount = Math.max(1, Math.ceil(filteredComponents.length / 4))
  const safeComponentPage = Math.min(componentPage, componentPageCount - 1)
  const visibleComponents = filteredComponents.slice(safeComponentPage * 4, safeComponentPage * 4 + 4)

  useEffect(() => {
    if (componentPage >= componentPageCount) setComponentPage(componentPageCount - 1)
  }, [componentPage, componentPageCount])

  const renderSettings = (items: typeof layoutSettings) => (
    <section className={styles.group}>
      {items.map(({ label, icon: Icon, section: target }) => (
        <button className={styles.settingRow} type="button" key={label} onClick={() => setSection(target)}>
          <Icon size={16} /><span>{label}</span><ChevronRight size={15} />
        </button>
      ))}
    </section>
  )

  const saveCurrentStyle = () => {
    if (stylePreset.builtIn) {
      setStyleName(`${stylePreset.name} 副本`)
      setSaveDialogOpen(true)
      return
    }
    onSaveStyle()
  }

  const saveBar = styleDirty ? (
    <div className={styles.styleSaveBar} role="region" aria-label="未保存的风格修改">
      <span>未保存的修改</span>
      <div>
        <Button size="sm" onClick={onDiscardStyleChanges}>撤销</Button>
        <Button size="sm" variant="primary" onClick={saveCurrentStyle}>{stylePreset.builtIn ? '另存并应用' : '保存并应用'}</Button>
      </div>
    </div>
  ) : null

  return (
    <>
    <aside className={styles.panel} role="region" aria-label="排版设置" data-open={open} aria-hidden={open ? undefined : true} inert={open ? undefined : true}>
      <header className={styles.header}>
        <Tabs ariaLabel="设置区域" items={[{ value: 'layout', label: '排版设置' }, { value: 'components', label: '组件' }, { value: 'page', label: '页面设置' }]} value={tab} onValueChange={onTabChange} />
        <IconButton label="隐藏右侧边栏" onClick={onClose}><PanelRightClose size={16} /></IconButton>
      </header>
      {libraryOpen ? (
        <div className={styles.libraryContent} role="region" aria-label="风格库">
          <div className={styles.editorTitle}>
            <IconButton label="返回排版设置" onClick={() => setLibraryOpen(false)}><ArrowLeft size={16} /></IconButton>
            <div><h3>风格库</h3><p>为当前文章选择排版风格</p></div>
          </div>
          {[
            { title: '内置风格', items: availableStyles.filter((preset) => preset.builtIn) },
            { title: '我的风格', items: availableStyles.filter((preset) => !preset.builtIn) },
          ].map((group) => group.items.length ? (
            <section className={styles.libraryGroup} key={group.title}>
              <h4>{group.title}</h4>
              {group.items.map((preset) => {
                const applied = preset.id === activeStyleId
                return (
                  <Card className={styles.libraryCard} selected={applied} key={preset.id}>
                    <span className={styles.librarySwatch} style={{ color: preset.global.accentColor, background: preset.global.backgroundColor }}><i /><i /><i /></span>
                    <span><strong>{preset.name}</strong><small>{preset.description}</small></span>
                    <span className={styles.libraryActions}>
                      {applied ? <em><Check size={12} />已应用</em> : <Button size="sm" onClick={() => onStyleSelect(preset.id)}>应用 {preset.name}</Button>}
                      {!preset.builtIn ? (
                        <DropdownMenu
                          trigger={<IconButton className={styles.libraryMenuButton} label={`管理 ${preset.name}`}><MoreHorizontal size={15} /></IconButton>}
                          items={[
                            { id: 'rename', label: '重命名风格', onSelect: () => setRenameTarget(preset) },
                            { id: 'reset', label: '恢复基础风格', onSelect: () => onResetStyle(preset.id) },
                            { id: 'delete', label: '删除风格', separatorBefore: true, onSelect: () => setDeleteTarget(preset) },
                          ]}
                        />
                      ) : null}
                    </span>
                  </Card>
                )
              })}
            </section>
          ) : null)}
          {saveBar}
        </div>
      ) : section ? (
        <StyleEditor section={section} preset={stylePreset} dirty={styleDirty} onChange={onStyleValueChange} onDiscard={onDiscardStyleChanges} onSave={saveCurrentStyle} onBack={() => setSection(null)} />
      ) : tab === 'layout' ? (
        <div className={styles.content} role="region" aria-label="可滚动设置内容">
          <section>
            <h3>当前风格</h3>
            <Card className={styles.styleCard}>
              <span className={styles.stylePreview} style={{ color: stylePreset.global.accentColor }}><i /><i /><i /></span>
              <span className={styles.styleIdentity}>
                <strong>{stylePreset.name}</strong>
                <small>{stylePreset.description}</small>
              </span>
              <button type="button" onClick={() => setLibraryOpen(true)}>更换风格</button>
            </Card>
          </section>
          {renderSettings(layoutSettings)}
          {saveBar}
        </div>
      ) : tab === 'page' ? (
        <div className={styles.pageContent} role="region" aria-label="可滚动设置内容">
          <section className={styles.pageSettings}>
            <h3>页面设置</h3>
            <div className={styles.controlRow}><span>页面宽度</span><div className={styles.slider}><Slider label="页面宽度" value={pageWidth} min={520} max={900} onValueChange={onPageWidthChange} /></div><Input aria-label="页面宽度数值" type="number" value={pageWidth[0]} onChange={(event) => onPageWidthChange([Number(event.target.value)])} /><em>px</em></div>
            <div className={styles.controlRow}><span>字体</span><select aria-label="页面字体" value={stylePreset.global.fontFamily} onChange={(event) => onStyleValueChange('global.fontFamily', event.target.value)}><option value="system-ui">系统字体</option><option value="serif">宋体</option><option value="monospace">等宽字体</option></select></div>
            <div className={styles.controlRow}><span>字号</span><Input aria-label="字号" type="number" value={stylePreset.global.fontSize} onChange={(event) => onStyleValueChange('global.fontSize', Number(event.target.value))} /><em>px</em></div>
            <div className={styles.controlRow}><span>行高</span><Input aria-label="行高" type="number" step="0.05" value={stylePreset.global.lineHeight} onChange={(event) => onStyleValueChange('global.lineHeight', Number(event.target.value))} /></div>
            <div className={styles.controlRow}><span>段间距</span><Input aria-label="段间距" type="number" value={stylePreset.global.paragraphSpacing} onChange={(event) => onStyleValueChange('global.paragraphSpacing', Number(event.target.value))} /><em>px</em></div>
            <div className={styles.controlRow}><span>主题色</span><label className={styles.colorValue}><input aria-label="主题色" type="color" value={stylePreset.global.accentColor} onChange={(event) => onStyleValueChange('global.accentColor', event.target.value)} /><span>{stylePreset.global.accentColor}</span></label></div>
          </section>
          <section className={styles.extractSettings}>
            <h3>公众号文章提取</h3>
            <label><span>文章内容</span><select aria-label="公众号文章保存方式" value={wechatArticleSavePolicy} onChange={(event) => onWechatArticleSavePolicyChange(event.target.value as 'ask' | 'always' | 'never')}><option value="ask">每次询问</option><option value="always">自动保存</option><option value="never">不保存</option></select></label>
            <p>不保存正文时仍会临时读取内容并分析排版。</p>
          </section>
          {saveBar}
        </div>
      ) : (
        <div className={styles.componentContent} role="region" aria-label="组件设置内容">
          <h3>组件样式</h3>
          <p>在光标位置插入内容块，选中正文后也可以保存为自己的组件。</p>
          <Button className={styles.saveSelectionButton} disabled={!selectedText.trim()} onClick={() => { setComponentName(''); setComponentSaveOpen(true) }}>将选中内容保存为组件</Button>
          <div className={styles.componentCategories} aria-label="组件分类">
            {componentCategories.map((category) => (
              <button
                type="button"
                key={category.id}
                aria-pressed={componentCategory === category.id}
                onClick={() => { setComponentCategory(category.id); setComponentPage(0) }}
              >{category.label}</button>
            ))}
          </div>
          <div className={styles.componentList} key={`${componentCategory}-${safeComponentPage}`}>
            {visibleComponents.map((item) => (
              <Card className={styles.componentCard} key={item.id}>
                <span><strong>{item.name}</strong><small>{item.description}</small></span>
                <span className={styles.componentActions}>
                  <Button size="sm" aria-label={`插入 ${item.name}`} onClick={() => onInsertComponent(item.id)}>插入</Button>
                  {!item.builtIn ? <DropdownMenu trigger={<IconButton label={`管理 ${item.name}`}><MoreHorizontal size={15} /></IconButton>} items={[
                    { id: `rename-component-${item.id}`, label: '重命名组件', onSelect: () => setComponentRenameTarget(item) },
                    { id: `delete-component-${item.id}`, label: '删除组件', onSelect: () => setComponentDeleteTarget(item) },
                  ]} /> : null}
                </span>
              </Card>
            ))}
            {visibleComponents.length === 0 ? <div className={styles.componentEmpty}>还没有自定义组件</div> : null}
          </div>
          <div className={styles.componentPager} aria-label="组件分页">
            <IconButton label="上一页" disabled={safeComponentPage === 0} onClick={() => setComponentPage((current) => Math.max(0, current - 1))}><ChevronLeft size={15} /></IconButton>
            <span>{safeComponentPage + 1} / {componentPageCount}</span>
            <IconButton label="下一页" disabled={safeComponentPage >= componentPageCount - 1} onClick={() => setComponentPage((current) => Math.min(componentPageCount - 1, current + 1))}><ChevronRight size={15} /></IconButton>
          </div>
        </div>
      )}
    </aside>
    <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} title="保存为新风格">
      <div className={styles.saveDialogBody}>
        <label><span>风格名称</span><Input aria-label="风格名称" value={styleName} onChange={(event) => setStyleName(event.target.value)} /></label>
        <div className={styles.dialogActions}>
          <Button onClick={() => setSaveDialogOpen(false)}>取消</Button>
          <Button variant="primary" disabled={!styleName.trim()} onClick={() => { onSaveStyle(styleName); setSaveDialogOpen(false) }}>保存并应用</Button>
        </div>
      </div>
    </Dialog>
    <Dialog open={renameTarget !== null} onOpenChange={(nextOpen) => { if (!nextOpen) setRenameTarget(null) }} title="重命名风格">
      <div className={styles.saveDialogBody}>
        <label><span>风格名称</span><Input aria-label="风格名称" value={renameTarget?.name ?? ''} onChange={(event) => setRenameTarget((current) => current ? { ...current, name: event.target.value } : null)} /></label>
        <div className={styles.dialogActions}>
          <Button onClick={() => setRenameTarget(null)}>取消</Button>
          <Button variant="primary" disabled={!renameTarget?.name.trim()} onClick={() => { if (renameTarget) onRenameStyle(renameTarget.id, renameTarget.name); setRenameTarget(null) }}>保存名称</Button>
        </div>
      </div>
    </Dialog>
    <Dialog open={deleteTarget !== null} onOpenChange={(nextOpen) => { if (!nextOpen) setDeleteTarget(null) }} title="删除风格">
      <div className={styles.saveDialogBody}>
        <p className={styles.dialogMessage}>删除“{deleteTarget?.name}”后，使用它的文章会恢复为默认风格。</p>
        <div className={styles.dialogActions}>
          <Button onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button variant="primary" onClick={() => { if (deleteTarget) onDeleteStyle(deleteTarget.id); setDeleteTarget(null) }}>确认删除</Button>
        </div>
      </div>
    </Dialog>
    <Dialog open={componentSaveOpen} onOpenChange={setComponentSaveOpen} title="保存为组件">
      <div className={styles.saveDialogBody}>
        <label><span>组件名称</span><Input aria-label="组件名称" value={componentName} onChange={(event) => setComponentName(event.target.value)} /></label>
        <div className={styles.dialogActions}><Button onClick={() => setComponentSaveOpen(false)}>取消</Button><Button variant="primary" disabled={!componentName.trim()} onClick={() => { onSaveComponent(componentName.trim()); setComponentCategory('custom'); setComponentPage(Math.floor(availableComponents.filter((component) => !component.builtIn).length / 4)); setComponentSaveOpen(false) }}>保存组件</Button></div>
      </div>
    </Dialog>
    <Dialog open={componentRenameTarget !== null} onOpenChange={(nextOpen) => { if (!nextOpen) setComponentRenameTarget(null) }} title="重命名组件">
      <div className={styles.saveDialogBody}>
        <label><span>组件名称</span><Input aria-label="组件名称" value={componentRenameTarget?.name ?? ''} onChange={(event) => setComponentRenameTarget((current) => current ? { ...current, name: event.target.value } : null)} /></label>
        <div className={styles.dialogActions}><Button onClick={() => setComponentRenameTarget(null)}>取消</Button><Button variant="primary" disabled={!componentRenameTarget?.name.trim()} onClick={() => { if (componentRenameTarget) onRenameComponent(componentRenameTarget.id, componentRenameTarget.name.trim()); setComponentRenameTarget(null) }}>保存名称</Button></div>
      </div>
    </Dialog>
    <Dialog open={componentDeleteTarget !== null} onOpenChange={(nextOpen) => { if (!nextOpen) setComponentDeleteTarget(null) }} title="删除组件">
      <div className={styles.saveDialogBody}>
        <p className={styles.dialogMessage}>删除“{componentDeleteTarget?.name}”后无法恢复，已插入文章的内容不会受影响。</p>
        <div className={styles.dialogActions}><Button onClick={() => setComponentDeleteTarget(null)}>取消</Button><Button variant="primary" onClick={() => { if (componentDeleteTarget) onDeleteComponent(componentDeleteTarget.id); setComponentDeleteTarget(null) }}>确认删除</Button></div>
      </div>
    </Dialog>
    </>
  )
}
