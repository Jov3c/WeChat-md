import { useEffect, useRef, useState } from 'react'
import { TitleBar } from '../components/chrome/TitleBar'
import { Toolbar } from '../components/chrome/Toolbar'
import { EditorPanel, type EditorPanelHandle, type EditorSelection } from '../components/editor/EditorPanel'
import { PreviewPanel, type PreviewDevice, type PreviewPanelHandle } from '../components/preview/PreviewPanel'
import { SettingsPanel } from '../components/settings/SettingsPanel'
import { Sidebar } from '../components/sidebar/Sidebar'
import { Toast } from '../components/ui'
import { copyPreviewArticle } from '../features/clipboard/richTextClipboard'
import { articles, type ArticleItem } from './demoData'
import styles from './App.module.css'

let articleSequence = 0

function createArticleId() {
  articleSequence += 1
  return `local-${Date.now()}-${articleSequence}`
}

function readFileText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result ?? '')))
    reader.addEventListener('error', () => reject(reader.error ?? new Error('无法读取文件')))
    reader.readAsText(file)
  })
}

export function App() {
  const [articleList, setArticleList] = useState<ArticleItem[]>(() => articles.map((article) => ({ ...article })))
  const [selectedId, setSelectedId] = useState(articles[0].id)
  const [editorTab, setEditorTab] = useState('edit')
  const [settingsTab, setSettingsTab] = useState('layout')
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  const [pageWidth, setPageWidth] = useState([720])
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [editorSelection, setEditorSelection] = useState<EditorSelection>()
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('操作已完成')
  const sidebarToggleStarted = useRef(false)
  const previewArticleRef = useRef<HTMLElement>(null)
  const editorPanelRef = useRef<EditorPanelHandle>(null)
  const previewPanelRef = useRef<PreviewPanelHandle>(null)
  const selectedArticle = articleList.find((article) => article.id === selectedId)
  const content = selectedArticle?.content ?? ''

  useEffect(() => {
    if (!sidebarToggleStarted.current) return
    const label = settingsOpen ? '隐藏右侧边栏' : '显示右侧边栏'
    document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)?.focus()
  }, [settingsOpen])

  const setRightSidebarOpen = (open: boolean) => {
    sidebarToggleStarted.current = true
    setSettingsOpen(open)
  }

  const selectArticle = (id: string) => {
    if (!articleList.some((article) => article.id === id)) return
    setSelectedId(id)
  }

  const updateContent = (nextContent: string) => {
    setArticleList((current) => current.map((article) => article.id === selectedId ? { ...article, content: nextContent, date: '刚刚' } : article))
  }

  const createNewArticle = () => {
    const article: ArticleItem = { id: createArticleId(), title: '未命名文章', date: '刚刚', content: '' }
    setArticleList((current) => [article, ...current])
    setSelectedId(article.id)
  }

  const importArticle = async (file: File) => {
    try {
      const markdown = await readFileText(file)
      const title = file.name.replace(/\.(?:md|markdown|txt)$/i, '') || '导入文章'
      const article: ArticleItem = { id: createArticleId(), title, date: '刚刚', content: markdown }
      setArticleList((current) => [article, ...current])
      setSelectedId(article.id)
      setToastMessage('Markdown 已导入')
      setToastOpen(true)
    } catch {
      setToastMessage('文件读取失败')
      setToastOpen(true)
    }
  }

  const copyArticle = async () => {
    if (!content.trim()) {
      setToastMessage('文章内容为空')
      setToastOpen(true)
      return
    }

    if (!previewArticleRef.current) return

    try {
      await copyPreviewArticle(previewArticleRef.current, content)
      setToastMessage('已复制到剪贴板')
    } catch {
      setToastMessage('复制失败，请检查剪贴板权限')
    }
    setToastOpen(true)
  }

  return (
    <main className={styles.app}>
      <TitleBar />
      <Toolbar
        onNewArticle={createNewArticle}
        onImport={importArticle}
        onExtract={() => undefined}
        onCopy={copyArticle}
      />
      <div className={styles.workspace} role="region" aria-label="编辑工作区" data-settings-open={settingsOpen}>
        <Sidebar articles={articleList} selectedId={selectedId} onSelect={selectArticle} />
        <EditorPanel
          ref={editorPanelRef}
          value={content}
          onChange={updateContent}
          tab={editorTab}
          onTabChange={setEditorTab}
          onSelectionChange={setEditorSelection}
          onScrollRatioChange={(ratio) => { if (syncEnabled) previewPanelRef.current?.setScrollRatio(ratio) }}
        />
        <PreviewPanel
          ref={previewPanelRef}
          markdown={content}
          articleRef={previewArticleRef}
          device={device}
          onDeviceChange={setDevice}
          syncEnabled={syncEnabled}
          selection={editorSelection}
          onSyncEnabledChange={setSyncEnabled}
          onBlockActivate={(startLine, endLine) => editorPanelRef.current?.focusLines(startLine, endLine)}
          onScrollRatioChange={(ratio) => { if (syncEnabled) editorPanelRef.current?.setScrollRatio(ratio) }}
          settingsOpen={settingsOpen}
          onShowSettings={() => setRightSidebarOpen(true)}
        />
        <SettingsPanel open={settingsOpen} tab={settingsTab} onTabChange={setSettingsTab} pageWidth={pageWidth} onPageWidthChange={setPageWidth} onClose={() => setRightSidebarOpen(false)} />
      </div>
      <Toast open={toastOpen} onOpenChange={setToastOpen} message={toastMessage} />
    </main>
  )
}
