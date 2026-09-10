import { ChevronRight, Code2, Image, Link2, List, Minus, PanelTop, Quote, Settings2, Table2, Type } from 'lucide-react'
import { Card, Input, Slider, Tabs } from '../ui'
import styles from './SettingsPanel.module.css'

export interface SettingsPanelProps {
  tab: string
  onTabChange: (tab: string) => void
  pageWidth: number[]
  onPageWidthChange: (value: number[]) => void
}

const settings = [
  { label: '全局设置', icon: Settings2 }, { label: '标题样式', icon: Type },
  { label: '正文样式', icon: PanelTop }, { label: '引用样式', icon: Quote },
  { label: '代码样式', icon: Code2 }, { label: '列表样式', icon: List },
  { label: '表格样式', icon: Table2 }, { label: '图片样式', icon: Image },
  { label: '分割线样式', icon: Minus }, { label: '链接样式', icon: Link2 },
]

export function SettingsPanel({ tab, onTabChange, pageWidth, onPageWidthChange }: SettingsPanelProps) {
  return (
    <aside className={styles.panel} role="region" aria-label="排版设置">
      <header className={styles.header}>
        <Tabs ariaLabel="设置区域" items={[{ value: 'layout', label: '排版设置' }, { value: 'components', label: '组件' }]} value={tab} onValueChange={onTabChange} />
      </header>
      {tab === 'layout' ? (
        <div className={styles.content}>
          <section>
            <h3>当前风格</h3>
            <Card selected className={styles.styleCard}>
              <span className={styles.stylePreview}><i /><i /><i /></span>
              <span><strong>默认 · 简洁</strong><small>清爽、专注的公众号风格</small></span>
              <button type="button">更换风格</button>
            </Card>
          </section>
          <section className={styles.group}>
            {settings.map(({ label, icon: Icon }) => (
              <button className={styles.settingRow} type="button" key={label}><Icon size={16} /><span>{label}</span><ChevronRight size={15} /></button>
            ))}
          </section>
          <section className={styles.pageSettings}>
            <h3>页面设置</h3>
            <div className={styles.controlRow}><span>页面宽度</span><div className={styles.slider}><Slider label="页面宽度" value={pageWidth} min={560} max={820} onValueChange={onPageWidthChange} /></div><Input aria-label="页面宽度数值" value={pageWidth[0]} readOnly /><em>px</em></div>
            <div className={styles.controlRow}><span>字体</span><button className={styles.selectLike} type="button">系统字体 <ChevronRight size={13} /></button></div>
            <div className={styles.controlRow}><span>字号</span><Input aria-label="字号" value="16" readOnly /><em>px</em></div>
            <div className={styles.controlRow}><span>行高</span><Input aria-label="行高" value="1.8" readOnly /></div>
          </section>
        </div>
      ) : (
        <div className={styles.componentContent}>
          <h3>组件样式</h3>
          <p>为文章中的独立内容块选择样式。</p>
          {['信息卡片', '步骤列表', '重点提示', '图片说明'].map((item) => <Card className={styles.componentCard} key={item}>{item}<ChevronRight size={15} /></Card>)}
        </div>
      )}
    </aside>
  )
}
