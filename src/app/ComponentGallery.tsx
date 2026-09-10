import { useState } from 'react'
import { Bell, MoreHorizontal, Search } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DropdownMenu,
  IconButton,
  Input,
  Slider,
  Switch,
  Tabs,
  Toast,
  Tooltip,
} from '../components/ui'
import styles from './ComponentGallery.module.css'

export function ComponentGallery() {
  const [tab, setTab] = useState('default')
  const [autoSave, setAutoSave] = useState(true)
  const [saveBody, setSaveBody] = useState(true)
  const [width, setWidth] = useState([720])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)

  return (
    <main className={styles.gallery}>
      <header className={styles.intro}>
        <div><Badge>WeChat MD</Badge><h1>UI 组件库</h1><p>温暖、克制、专注于长文创作的界面基础。</p></div>
        <a href="/">返回编辑器</a>
      </header>

      <section className={styles.section}>
        <h2>操作按钮</h2>
        <div className={styles.row}>
          <Button variant="primary">主要按钮</Button>
          <Button>次要按钮</Button>
          <Button variant="ghost">文字按钮</Button>
          <Button disabled>禁用按钮</Button>
          <Tooltip content="通知"><IconButton label="通知"><Bell size={17} /></IconButton></Tooltip>
          <DropdownMenu trigger={<IconButton label="菜单"><MoreHorizontal size={18} /></IconButton>} items={[{ id: 'one', label: '保存为模板', onSelect: () => setToastOpen(true) }]} />
        </div>
      </section>

      <section className={styles.section}>
        <h2>输入与选择</h2>
        <div className={styles.formGrid}>
          <Input aria-label="搜索示例" placeholder="搜索文章..." leadingIcon={<Search size={16} />} />
          <Tabs ariaLabel="组件状态" items={[{ value: 'default', label: '默认' }, { value: 'selected', label: '选中' }]} value={tab} onValueChange={setTab} />
          <label className={styles.controlLabel}><span>自动保存</span><Switch checked={autoSave} onCheckedChange={setAutoSave} label="自动保存" /></label>
          <label className={styles.controlLabel}><span>保存正文</span><Checkbox checked={saveBody} onCheckedChange={setSaveBody} label="保存正文" /></label>
          <label className={styles.sliderLabel}><span>页面宽度</span><Slider label="组件库页面宽度" value={width} min={560} max={820} onValueChange={setWidth} /><strong>{width[0]} px</strong></label>
        </div>
      </section>

      <section className={styles.section}>
        <h2>容器与反馈</h2>
        <div className={styles.cards}>
          <Card className={styles.card}><strong>默认卡片</strong><span>用于承载设置与选择项</span></Card>
          <Card selected className={styles.card}><strong>选中卡片</strong><span>使用温暖的强调背景</span></Card>
        </div>
        <div className={styles.row}>
          <Button onClick={() => setDialogOpen(true)}>打开对话框</Button>
          <Button onClick={() => setToastOpen(true)}>显示提示</Button>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title="公众号文章导入">
        <p className={styles.dialogText}>输入公众号文章链接后，将读取排版信息并生成可复用风格。</p>
        <Input aria-label="公众号文章链接" placeholder="https://mp.weixin.qq.com/..." />
      </Dialog>
      <Toast open={toastOpen} onOpenChange={setToastOpen} message="操作已完成" />
    </main>
  )
}
