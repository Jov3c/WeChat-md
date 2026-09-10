import { useState } from 'react'
import { TitleBar } from '../components/chrome/TitleBar'
import { Toolbar } from '../components/chrome/Toolbar'
import { EditorPanel } from '../components/editor/EditorPanel'
import { PreviewPanel, type PreviewDevice } from '../components/preview/PreviewPanel'
import { SettingsPanel } from '../components/settings/SettingsPanel'
import { Sidebar } from '../components/sidebar/Sidebar'
import { Toast } from '../components/ui'
import { articles } from './demoData'
import styles from './App.module.css'

export function App() {
  const [selectedId, setSelectedId] = useState(articles[0].id)
  const [content, setContent] = useState(articles[0].content)
  const [editorTab, setEditorTab] = useState('edit')
  const [settingsTab, setSettingsTab] = useState('layout')
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  const [pageWidth, setPageWidth] = useState([720])
  const [toastOpen, setToastOpen] = useState(false)

  const selectArticle = (id: string) => {
    const article = articles.find((item) => item.id === id)
    if (!article) return
    setSelectedId(id)
    setContent(article.content)
  }

  return (
    <main className={styles.app}>
      <TitleBar />
      <Toolbar
        onNewArticle={() => setContent('')}
        onImport={() => undefined}
        onExtract={() => undefined}
        onCopy={() => setToastOpen(true)}
      />
      <div className={styles.workspace}>
        <Sidebar articles={articles} selectedId={selectedId} onSelect={selectArticle} />
        <EditorPanel value={content} onChange={setContent} tab={editorTab} onTabChange={setEditorTab} />
        <PreviewPanel device={device} onDeviceChange={setDevice} syncEnabled />
        <SettingsPanel tab={settingsTab} onTabChange={setSettingsTab} pageWidth={pageWidth} onPageWidthChange={setPageWidth} />
      </div>
      <Toast open={toastOpen} onOpenChange={setToastOpen} message="已复制到剪贴板" />
    </main>
  )
}
