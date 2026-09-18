import { useEffect, useMemo, useRef, useState } from 'react'
import { TitleBar } from '../components/chrome/TitleBar'
import { Toolbar } from '../components/chrome/Toolbar'
import { EditorPanel, type EditorPanelHandle, type EditorSelection } from '../components/editor/EditorPanel'
import { PreviewPanel, type PreviewDevice, type PreviewPanelHandle } from '../components/preview/PreviewPanel'
import { SettingsPanel } from '../components/settings/SettingsPanel'
import { SoftwareSettingsDialog } from '../components/settings/SoftwareSettingsDialog'
import { Sidebar } from '../components/sidebar/Sidebar'
import { TemplateLibraryDialog } from '../components/templates/TemplateLibraryDialog'
import { WechatExtractDialog } from '../components/wechat/WechatExtractDialog'
import { AssetLibraryDialog } from '../components/assets/AssetLibraryDialog'
import { VersionHistoryDialog } from '../components/versions/VersionHistoryDialog'
import { Button, Dialog, Input, Toast } from '../components/ui'
import { copyPreparedArticle, makeImageSourcesPortable, preparePreviewArticleForClipboard, prepareSerializedArticleForClipboard, serializePreviewArticle } from '../features/clipboard/richTextClipboard'
import { createHtmlExport, createMarkdownExport } from '../features/export/articleExport'
import { createWorkspaceBackup, mergeWorkspaceBackup, readWorkspaceBackup } from '../features/backup/workspaceBackup'
import { inspectPublication, type PublicationIssue } from '../features/publication/publicationPreflight'
import { validateWechatHtml, type WechatHtmlValidationIssue } from '../features/publication/wechatHtmlValidator'
import { createBrowserArticleRepository, type ArticleLibrarySnapshot, type ArticleRepository } from '../features/articles/articleRepository'
import { collectImageAssetIds, replaceImageAssetUrls } from '../features/assets/assetMarkdown'
import { createBrowserAssetRepository, type AssetRepository } from '../features/assets/assetRepository'
import { builtInStylePresets, duplicateStylePreset, updateStylePreset, type StylePreset, type StyleValuePath } from '../features/styles/stylePresets'
import { builtInContentTemplates, createCustomContentTemplate, type ArticleContentTemplate } from '../features/templates/templatePresets'
import { builtInLayouts, type ArticleLayoutId } from '../features/layouts/articleLayouts'
import { migrateLegacyTemplateData } from '../features/templates/templateMigration'
import { builtInContentComponents, createCustomContentComponent, type ContentComponent } from '../features/components/contentComponents'
import { extractWechatArticle, type ExtractedWechatArticle } from '../features/wechat/wechatExtraction'
import { createBrowserVersionRepository, type VersionRepository } from '../features/versions/versionRepository'
import { createBrowserRecoveryRepository, type RecoveryRepository } from '../features/recovery/recoveryRepository'
import { articles, replaceLegacyDemoArticles, type ArticleItem } from './demoData'
import type { OpenedTextFile, RuntimeServices } from '../platform/contracts'
import { createBrowserFileService } from '../platform/fileServices'
import { useAutosave } from './hooks/useAutosave'
import { useAssets } from './hooks/useAssets'
import { useVersions } from './hooks/useVersions'
import { useWechatExtraction } from './hooks/useWechatExtraction'
import { useRecovery } from './hooks/useRecovery'
import styles from './App.module.css'

let articleSequence = 0
let styleSequence = 0
let templateSequence = 0
let componentSequence = 0

function createArticleId() {
  articleSequence += 1
  return `local-${Date.now()}-${articleSequence}`
}

type PendingWorkspaceAction =
  | { type: 'new' }
  | { type: 'import'; file: OpenedTextFile }

export interface AppProps {
  services?: RuntimeServices
  articleRepository?: ArticleRepository
  assetRepository?: AssetRepository
  versionRepository?: VersionRepository
  recoveryRepository?: RecoveryRepository
  saveDelay?: number
  wechatExtractor?: (url: string) => Promise<ExtractedWechatArticle>
}

export function App({ services, articleRepository, assetRepository, versionRepository, recoveryRepository: recoveryRepositoryProp, saveDelay = 5000, wechatExtractor: wechatExtractorProp }: AppProps = {}) {
  const runtime = services?.kind ?? 'web'
  const repository = useMemo(() => services ? services.articleRepository : articleRepository ?? createBrowserArticleRepository(), [articleRepository, services])
  const imageRepository = useMemo(() => services ? services.assetRepository : assetRepository ?? createBrowserAssetRepository(), [assetRepository, services])
  const versionsRepository = useMemo(() => services ? services.versionRepository : versionRepository ?? createBrowserVersionRepository(), [services, versionRepository])
  const recoveryRepository = useMemo(() => services ? services.recoveryRepository : recoveryRepositoryProp ?? createBrowserRecoveryRepository(), [recoveryRepositoryProp, services])
  const wechatExtractor = services?.extractWechatArticle ?? wechatExtractorProp ?? extractWechatArticle
  const files = useMemo(() => services?.files ?? createBrowserFileService(), [services])
  const [articleList, setArticleList] = useState<ArticleItem[]>(() => articles.map((article) => ({ ...article })))
  const [selectedId, setSelectedId] = useState(articles[0].id)
  const [editorTab, setEditorTab] = useState('edit')
  const [settingsTab, setSettingsTab] = useState('layout')
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  const [stylePresets, setStylePresets] = useState<StylePreset[]>(() => builtInStylePresets)
  const [templates, setTemplates] = useState<ArticleContentTemplate[]>(() => builtInContentTemplates)
  const [contentComponents, setContentComponents] = useState<ContentComponent[]>(() => builtInContentComponents)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [styleDraft, setStyleDraft] = useState<StylePreset | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [styleLibraryRequest, setStyleLibraryRequest] = useState(0)
  const [pendingStyleId, setPendingStyleId] = useState<string>()
  const [pendingArticleId, setPendingArticleId] = useState<string>()
  const [pendingWorkspaceAction, setPendingWorkspaceAction] = useState<PendingWorkspaceAction>()
  const [draftGuardOpen, setDraftGuardOpen] = useState(false)
  const [guardStyleName, setGuardStyleName] = useState('')
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [editorSelection, setEditorSelection] = useState<EditorSelection>()
  const [selectedComponentText, setSelectedComponentText] = useState('')
  const [editorFullscreen, setEditorFullscreen] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('操作已完成')
  const [publicationIssues, setPublicationIssues] = useState<Array<PublicationIssue | WechatHtmlValidationIssue>>([])
  const [pendingPublicationCopy, setPendingPublicationCopy] = useState<{ html: string; plainText: string }>()
  const [renameTarget, setRenameTarget] = useState<ArticleItem>()
  const [renameTitle, setRenameTitle] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ArticleItem>()
  const [softwareSettingsOpen, setSoftwareSettingsOpen] = useState(false)
  const [imageSaveDirectory, setImageSaveDirectory] = useState('')
  const [softwareSettingsBusy, setSoftwareSettingsBusy] = useState(false)
  const [storageReady, setStorageReady] = useState(repository === null)
  const sidebarToggleStarted = useRef(false)
  const previewArticleRef = useRef<HTMLElement>(null)
  const editorPanelRef = useRef<EditorPanelHandle>(null)
  const previewPanelRef = useRef<PreviewPanelHandle>(null)
  const copyPreparationRequestRef = useRef(0)
  const latestPublicationVersionRef = useRef('')
  const selectedArticle = articleList.find((article) => article.id === selectedId)
  const previousSelectedArticleRef = useRef<ArticleItem | undefined>(selectedArticle)
  const content = selectedArticle?.content ?? ''
  const updateContent = (nextContent: string) => {
    setSelectedComponentText('')
    setArticleList((current) => current.map((article) => {
      if (article.id !== selectedId) return article
      const heading = nextContent.match(/^#\s+(.+)$/m)?.[1]?.trim()
      return {
        ...article,
        content: nextContent,
        date: '刚刚',
        title: article.titleMode === 'auto' && heading ? heading.replace(/\s+#+$/, '') : article.title,
      }
    }))
  }
  const {
    assetLibraryOpen,
    setAssetLibraryOpen,
    resourceAssets,
    assetUrls,
    resourceAssetUrls,
    importImageFiles,
    openAssetLibrary,
    insertStoredAsset,
    saveRemoteAsset,
    importNetworkImage,
    removeAssetFromCurrentArticle,
    deleteUnusedAsset,
  } = useAssets({
    repository: imageRepository,
    articles: articleList,
    selectedId,
    content,
    imageFetcher: services?.imageFetcher,
    onInsertText: (markdown) => editorPanelRef.current?.insertText(markdown),
    onContentChange: updateContent,
    onNotify: (message) => {
      setToastMessage(message)
      setToastOpen(true)
    },
  })
  const previewMarkdown = useMemo(() => replaceImageAssetUrls(content, assetUrls), [assetUrls, content])
  const activeStyleId = selectedArticle?.styleId ?? 'default'
  const activeStyle = stylePresets.find((preset) => preset.id === activeStyleId) ?? builtInStylePresets[0]
  const activeLayoutId = selectedArticle?.layoutId ?? 'standard'
  const previewStyle = styleDraft ?? activeStyle
  const {
    wechatExtractOpen,
    setWechatExtractOpen,
    wechatSavePolicy,
    setWechatSavePolicy,
    saveWechatArticle,
    applyWechatStyle,
    mergeWechatStyle,
    saveWechatStyle,
  } = useWechatExtraction({
    extractor: wechatExtractor,
    imageArchive: services?.imageArchive,
    activeStyle,
    styleDraft,
    selectedId,
    createArticleId,
    saveRemoteAsset,
    onArticleSaved: (article) => {
      setArticleList((current) => [article, ...current])
      setSelectedComponentText('')
      setSelectedId(article.id)
    },
    onStyleDraftChange: setStyleDraft,
    onStyleSaved: (style, articleId) => {
      setStylePresets((current) => [...current, style])
      setArticleList((current) => current.map((article) => article.id === articleId ? { ...article, styleId: style.id } : article))
    },
    onOpenLayoutSettings: () => setSettingsTab('layout'),
    onNotify: (message) => {
      setToastMessage(message)
      setToastOpen(true)
    },
  })
  const publicationVersion = JSON.stringify({ selectedId, content, previewMarkdown, previewStyle, layoutId: activeLayoutId, contentTemplateId: selectedArticle?.contentTemplateId, device })
  latestPublicationVersionRef.current = publicationVersion
  const workspaceSnapshot = useMemo<ArticleLibrarySnapshot>(() => ({
    articles: articleList,
    selectedId,
    styles: stylePresets.filter((preset) => !preset.builtIn),
    templates: templates.filter((template) => !template.builtIn),
    components: contentComponents.filter((component) => !component.builtIn),
    wechatArticleSavePolicy: wechatSavePolicy,
    syncEnabled,
  }), [articleList, contentComponents, selectedId, stylePresets, syncEnabled, templates, wechatSavePolicy])

  const {
    pendingRecovery,
    ignoreRecovery,
    acceptRecovery,
    markFormallySaved,
  } = useRecovery({
    repository: recoveryRepository,
    articles: articleList,
    currentArticle: selectedArticle,
    enabled: storageReady,
  })

  const {
    versionHistoryOpen,
    setVersionHistoryOpen,
    articleVersions,
    resetBaselines,
    saveVersionIfChanged,
    createDueAutomaticVersions,
    openVersionHistory,
    saveCurrentVersion,
    restoreArticleVersion,
    deleteVersionsForArticle,
    saveVersions,
    deleteVersionsForArticles,
  } = useVersions({
    repository: versionsRepository,
    articles: articleList,
    selectedId,
    stylePresets,
    storageReady,
    onSelectArticle: setSelectedId,
    onRestoreVersion: (target) => {
      let restoredStyleId = target.styleId
      if (target.styleSnapshot) {
        styleSequence += 1
        restoredStyleId = `restored-style-${Date.now()}-${styleSequence}`
        const restoredStyle = { ...target.styleSnapshot, id: restoredStyleId, name: `${target.styleSnapshot.name}（历史）`, builtIn: false }
        setStylePresets((current) => [...current, restoredStyle])
      }
      setArticleList((current) => current.map((article) => article.id === target.articleId ? {
        ...article,
        title: target.title,
        titleMode: 'manual',
        content: target.content,
        styleId: restoredStyleId,
        date: '刚刚',
      } : article))
    },
    onNotify: (message) => {
      setToastMessage(message)
      setToastOpen(true)
    },
  })

  const {
    saveStatus,
    savedAt,
    latestSnapshotRef,
    markSaved,
    markError,
    setSaveStatus,
  } = useAutosave({
    repository,
    snapshot: workspaceSnapshot,
    enabled: storageReady,
    delay: saveDelay,
    onSaved: async (snapshot) => {
      await createDueAutomaticVersions(snapshot)
      await markFormallySaved()
    },
  })

  useEffect(() => {
    if (runtime !== 'desktop') return
    const preventBrowserMenu = (event: MouseEvent) => event.preventDefault()
    document.addEventListener('contextmenu', preventBrowserMenu)
    return () => document.removeEventListener('contextmenu', preventBrowserMenu)
  }, [runtime])

  useEffect(() => {
    if (!repository) return
    let active = true
    repository.load()
      .then((storedSnapshot) => {
        if (!active) return
        const snapshot = storedSnapshot ? migrateLegacyTemplateData(storedSnapshot) : null
        if (snapshot?.articles.length) {
          const restoredStyles = [...builtInStylePresets, ...(snapshot.styles ?? []).filter((preset) => !preset.builtIn)]
          const restoredArticles = replaceLegacyDemoArticles(snapshot.articles)
          setArticleList(restoredArticles)
          setStylePresets(restoredStyles)
          setTemplates([...builtInContentTemplates, ...(snapshot.templates ?? []).filter((template) => !template.builtIn)])
          setContentComponents([...builtInContentComponents, ...(snapshot.components ?? []).filter((component) => !component.builtIn)])
          setWechatSavePolicy(snapshot.wechatArticleSavePolicy ?? 'ask')
          setSyncEnabled(snapshot.syncEnabled ?? true)
          const restoredId = restoredArticles.some((article) => article.id === snapshot.selectedId)
            ? snapshot.selectedId
            : restoredArticles[0].id
          setSelectedId(restoredId)
          previousSelectedArticleRef.current = restoredArticles.find((article) => article.id === restoredId)
          resetBaselines(restoredArticles, restoredStyles)
        }
        markSaved()
      })
      .catch(() => {
        if (active) markError()
      })
      .finally(() => {
        if (active) setStorageReady(true)
      })
    return () => { active = false }
  }, [markError, markSaved, repository, resetBaselines])

  useEffect(() => {
    const previous = previousSelectedArticleRef.current
    if (previous && previous.id !== selectedId) {
      void saveVersionIfChanged('safety', previous).catch(() => {
        setToastMessage('切换成功，但安全留档失败')
        setToastOpen(true)
      })
    }
    previousSelectedArticleRef.current = selectedArticle ? { ...selectedArticle } : undefined
  }, [articleList, selectedArticle, selectedId])

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
    if (styleDraft && id !== selectedId) {
      setPendingStyleId(undefined)
      setPendingArticleId(id)
      setGuardStyleName(activeStyle.builtIn ? `${activeStyle.name} 副本` : activeStyle.name)
      setDraftGuardOpen(true)
      return
    }
    void (async () => {
      if (id !== selectedId && selectedArticle) await saveVersionIfChanged('safety', selectedArticle)
      setSelectedComponentText('')
      setSelectedId(id)
    })().catch(() => {
      setToastMessage('安全留档失败，已保留在当前文章')
      setToastOpen(true)
    })
  }

  const openStyleLibrary = () => {
    setRightSidebarOpen(true)
    setSettingsTab('layout')
    setStyleLibraryRequest((current) => current + 1)
  }

  const openPageSettings = () => {
    setRightSidebarOpen(true)
    setSettingsTab('page')
  }

  const openSoftwareSettings = async () => {
    if (!services?.imageArchive) return
    setSoftwareSettingsOpen(true)
    setSoftwareSettingsBusy(true)
    try {
      setImageSaveDirectory(await services.imageArchive.getDirectory())
    } catch {
      setToastMessage('无法读取图片保存位置')
      setToastOpen(true)
    } finally {
      setSoftwareSettingsBusy(false)
    }
  }

  const chooseImageSaveDirectory = async () => {
    if (!services?.imageArchive) return
    setSoftwareSettingsBusy(true)
    try {
      const directory = await services.imageArchive.chooseDirectory()
      if (directory) setImageSaveDirectory(directory)
    } catch {
      setToastMessage('无法更改图片保存位置')
      setToastOpen(true)
    } finally {
      setSoftwareSettingsBusy(false)
    }
  }

  const resetImageSaveDirectory = async () => {
    if (!services?.imageArchive) return
    setSoftwareSettingsBusy(true)
    try {
      setImageSaveDirectory(await services.imageArchive.resetDirectory())
    } catch {
      setToastMessage('无法恢复默认保存位置')
      setToastOpen(true)
    } finally {
      setSoftwareSettingsBusy(false)
    }
  }

  const openImageSaveDirectory = async () => {
    try {
      await services?.imageArchive?.openDirectory(imageSaveDirectory)
    } catch {
      setToastMessage('无法打开图片保存位置')
      setToastOpen(true)
    }
  }

  const assignStyleToCurrentArticle = (styleId: string) => {
    setStyleDraft(null)
    setArticleList((current) => current.map((article) => article.id === selectedId ? { ...article, styleId } : article))
    setSaveStatus('saving')
  }

  const applyStyleToCurrentArticle = (styleId: string) => {
    const style = stylePresets.find((preset) => preset.id === styleId)
    if (!style) return
    assignStyleToCurrentArticle(styleId)
    setToastMessage(`已应用“${style.name}”`)
    setToastOpen(true)
  }

  const requestStyleApplication = (styleId: string) => {
    if (styleId === activeStyle.id) return
    if (styleDraft) {
      setPendingArticleId(undefined)
      setPendingStyleId(styleId)
      setGuardStyleName(activeStyle.builtIn ? `${activeStyle.name} 副本` : activeStyle.name)
      setDraftGuardOpen(true)
      return
    }
    applyStyleToCurrentArticle(styleId)
  }

  const discardDraftAndContinue = () => {
    const nextStyleId = pendingStyleId
    const nextArticleId = pendingArticleId
    const nextWorkspaceAction = pendingWorkspaceAction
    setStyleDraft(null)
    setPendingStyleId(undefined)
    setPendingArticleId(undefined)
    setPendingWorkspaceAction(undefined)
    setDraftGuardOpen(false)
    if (nextStyleId) applyStyleToCurrentArticle(nextStyleId)
    if (nextArticleId) setSelectedId(nextArticleId)
    if (nextWorkspaceAction) void performWorkspaceAction(nextWorkspaceAction)
  }

  const saveDraftAndContinue = () => {
    const nextStyleId = pendingStyleId
    const nextArticleId = pendingArticleId
    const nextWorkspaceAction = pendingWorkspaceAction
    saveStyleDraft(guardStyleName)
    setPendingStyleId(undefined)
    setPendingArticleId(undefined)
    setPendingWorkspaceAction(undefined)
    setDraftGuardOpen(false)
    if (nextStyleId) applyStyleToCurrentArticle(nextStyleId)
    if (nextArticleId) setSelectedId(nextArticleId)
    if (nextWorkspaceAction) void performWorkspaceAction(nextWorkspaceAction)
  }

  const cancelDraftGuard = () => {
    setPendingStyleId(undefined)
    setPendingArticleId(undefined)
    setPendingWorkspaceAction(undefined)
    setDraftGuardOpen(false)
  }

  const changeStyleValue = (path: StyleValuePath, value: string | number | boolean) => {
    setStyleDraft((current) => updateStylePreset(current ?? activeStyle, path, value))
  }

  const saveStyleDraft = (name?: string) => {
    if (!styleDraft) return
    let savedStyle: StylePreset
    if (activeStyle.builtIn) {
      styleSequence += 1
      savedStyle = duplicateStylePreset(styleDraft, `custom-${Date.now()}-${styleSequence}`, name?.trim() || `${activeStyle.name} 副本`)
      setStylePresets((current) => [...current, savedStyle])
    } else {
      savedStyle = { ...styleDraft, name: name?.trim() || styleDraft.name }
      setStylePresets((current) => current.map((preset) => preset.id === savedStyle.id ? savedStyle : preset))
    }
    setArticleList((current) => current.map((article) => article.id === selectedId ? { ...article, styleId: savedStyle.id } : article))
    setStyleDraft(null)
    setSaveStatus('saving')
    setToastMessage(`已保存并应用“${savedStyle.name}”`)
    setToastOpen(true)
    return savedStyle
  }

  const renameStyle = (styleId: string, name: string) => {
    const nextName = name.trim()
    if (!nextName) return
    setStylePresets((current) => current.map((preset) => preset.id === styleId && !preset.builtIn ? { ...preset, name: nextName } : preset))
    setStyleDraft((current) => current?.id === styleId ? { ...current, name: nextName } : current)
    setSaveStatus('saving')
    setToastMessage(`已重命名为“${nextName}”`)
    setToastOpen(true)
  }

  const deleteStyle = (styleId: string) => {
    const style = stylePresets.find((preset) => preset.id === styleId)
    if (!style || style.builtIn) return
    setStylePresets((current) => current.filter((preset) => preset.id !== styleId))
    setArticleList((current) => current.map((article) => article.styleId === styleId ? { ...article, styleId: 'default' } : article))
    setStyleDraft((current) => current?.id === styleId ? null : current)
    setSaveStatus('saving')
    setToastMessage(`已删除“${style.name}”`)
    setToastOpen(true)
  }

  const resetStyle = (styleId: string) => {
    const style = stylePresets.find((preset) => preset.id === styleId)
    if (!style || style.builtIn) return
    const base = builtInStylePresets.find((preset) => preset.id === style.basePresetId) ?? builtInStylePresets[0]
    const reset = duplicateStylePreset(base, style.id, style.name)
    setStylePresets((current) => current.map((preset) => preset.id === styleId ? reset : preset))
    setStyleDraft((current) => current?.id === styleId ? null : current)
    setSaveStatus('saving')
    setToastMessage(`已恢复“${style.name}”的基础风格`)
    setToastOpen(true)
  }

  function createBlankArticle() {
    const article: ArticleItem = {
      id: createArticleId(),
      title: '未命名文章',
      date: '刚刚',
      content: '',
      layoutId: 'standard',
      source: 'local',
      status: 'draft',
      titleMode: 'auto',
    }
    setArticleList((current) => [article, ...current])
    setSelectedComponentText('')
    setSelectedId(article.id)
    setSaveStatus('saving')
  }

  function applyLayoutToCurrentArticle(layoutId: ArticleLayoutId) {
    const layout = builtInLayouts.find((item) => item.id === layoutId)
    if (!layout || !selectedArticle) return
    setArticleList((current) => current.map((article) => article.id === selectedId
      ? { ...article, layoutId, date: '刚刚' }
      : article))
    setSaveStatus('saving')
    setToastMessage(`已应用“${layout.name}”`)
    setToastOpen(true)
  }

  function createArticleFromTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId)
    if (!template || !selectedArticle) return
    const title = template.content.match(/^#\s+(.+)$/m)?.[1]?.trim() || template.name
    const article: ArticleItem = {
      id: createArticleId(),
      title,
      date: '刚刚',
      content: template.content,
      layoutId: template.layoutId,
      contentTemplateId: template.id,
      source: 'local',
      status: 'draft',
      titleMode: 'auto',
    }
    setArticleList((current) => [article, ...current])
    setSelectedComponentText('')
    setSelectedId(article.id)
    setSaveStatus('saving')
    setToastMessage(`已用“${template.name}”新建文章`)
    setToastOpen(true)
  }

  function requestWorkspaceAction(action: PendingWorkspaceAction) {
    if (styleDraft) {
      setPendingStyleId(undefined)
      setPendingArticleId(undefined)
      setPendingWorkspaceAction(action)
      setGuardStyleName(activeStyle.builtIn ? `${activeStyle.name} 副本` : activeStyle.name)
      setDraftGuardOpen(true)
      return
    }
    void performWorkspaceAction(action)
  }

  async function performWorkspaceAction(action: PendingWorkspaceAction) {
    if (action.type === 'import') await importArticle(action.file)
    else createBlankArticle()
  }

  const openSaveTemplate = () => {
    setTemplateName('')
    setSaveTemplateOpen(true)
  }

  const saveCurrentTemplate = () => {
    const name = templateName.trim()
    if (!name) return
    templateSequence += 1
    const template = createCustomContentTemplate(`template-${Date.now()}-${templateSequence}`, name, content, activeLayoutId)
    setTemplates((current) => [...current, template])
    setSaveTemplateOpen(false)
    setSaveStatus('saving')
    setToastMessage(`已保存模板“${name}”`)
    setToastOpen(true)
  }

  const renameTemplate = (templateId: string, name: string) => {
    setTemplates((current) => current.map((template) => template.id === templateId && !template.builtIn ? { ...template, name } : template))
    setSaveStatus('saving')
  }

  const deleteTemplate = (templateId: string) => {
    setTemplates((current) => current.filter((template) => template.id !== templateId || template.builtIn))
    setSaveStatus('saving')
  }

  const insertComponent = (componentId: string) => {
    const component = contentComponents.find((item) => item.id === componentId)
    if (!component) return
    setEditorTab('edit')
    editorPanelRef.current?.insertText(component.content)
    setToastMessage(`已插入“${component.name}”`)
    setToastOpen(true)
  }

  const saveSelectedComponent = (name: string) => {
    const selectedText = selectedComponentText.trim()
    if (!selectedText) return
    componentSequence += 1
    const component = createCustomContentComponent(`component-${Date.now()}-${componentSequence}`, name, selectedText)
    setContentComponents((current) => [...current, component])
    setSaveStatus('saving')
    setToastMessage(`已保存组件“${name}”`)
    setToastOpen(true)
  }

  const renameComponent = (componentId: string, name: string) => {
    setContentComponents((current) => current.map((component) => component.id === componentId && !component.builtIn ? { ...component, name } : component))
    setSaveStatus('saving')
  }

  const deleteComponent = (componentId: string) => {
    setContentComponents((current) => current.filter((component) => component.id !== componentId || component.builtIn))
    setSaveStatus('saving')
  }

  const openArticleRename = (article: ArticleItem) => {
    setRenameTarget(article)
    setRenameTitle(article.title)
  }

  const renameArticle = () => {
    const title = renameTitle.trim()
    if (!renameTarget || !title) return
    setArticleList((current) => current.map((article) => article.id === renameTarget.id ? { ...article, title, titleMode: 'manual', date: '刚刚' } : article))
    setRenameTarget(undefined)
    setSaveStatus('saving')
  }

  const duplicateArticle = (id: string) => {
    const source = articleList.find((article) => article.id === id)
    if (!source) return
    const duplicate = { ...source, id: createArticleId(), title: `${source.title} 副本`, date: '刚刚', status: 'draft' as const }
    setArticleList((current) => [duplicate, ...current])
    setSelectedId(duplicate.id)
    setSaveStatus('saving')
  }

  const toggleArticleFavorite = (id: string) => {
    setArticleList((current) => current.map((article) => article.id === id ? { ...article, favorite: !article.favorite } : article))
    setSaveStatus('saving')
  }

  const toggleArticlePublished = (id: string) => {
    setArticleList((current) => current.map((article) => article.id === id
      ? { ...article, status: article.status === 'published' ? 'draft' : 'published' }
      : article))
    setSaveStatus('saving')
  }

  const moveArticleToTrash = (id: string) => {
    const target = articleList.find((article) => article.id === id)
    if (target) void saveVersionIfChanged('safety', target)
    setArticleList((current) => current.map((article) => article.id === id ? { ...article, status: 'trash' } : article))
    if (selectedId === id) {
      const fallback = articleList.find((article) => article.id !== id && article.status !== 'trash')
      if (fallback) setSelectedId(fallback.id)
    }
    setSaveStatus('saving')
  }

  const restoreArticle = (id: string) => {
    setArticleList((current) => current.map((article) => article.id === id ? { ...article, status: 'draft' } : article))
    setSaveStatus('saving')
  }

  const deleteArticlePermanently = () => {
    if (!deleteTarget) return
    const deletedId = deleteTarget.id
    setArticleList((current) => current.filter((article) => article.id !== deleteTarget.id))
    if (selectedId === deleteTarget.id) {
      const fallback = articleList.find((article) => article.id !== deleteTarget.id && article.status !== 'trash')
      if (fallback) {
        previousSelectedArticleRef.current = fallback
        setSelectedId(fallback.id)
      }
    }
    void deleteVersionsForArticle(deletedId)
    setDeleteTarget(undefined)
    setSaveStatus('saving')
  }

  const importArticle = async (file: OpenedTextFile) => {
    const title = file.name.replace(/\.(?:md|markdown|txt)$/i, '') || '导入文章'
    const article: ArticleItem = { id: createArticleId(), title, date: '刚刚', content: file.content, source: 'imported', status: 'draft', titleMode: 'manual' }
    setArticleList((current) => [article, ...current])
    setSelectedComponentText('')
    setSelectedId(article.id)
    setSaveStatus('saving')
    setToastMessage('Markdown 已导入')
    setToastOpen(true)
  }

  const openMarkdownArticle = async () => {
    try {
      const file = await files.openText({ title: '导入 Markdown', filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }] })
      if (file) requestWorkspaceAction({ type: 'import', file })
    } catch {
      setToastMessage('文件读取失败')
      setToastOpen(true)
    }
  }

  const performCopy = async (prepared = pendingPublicationCopy) => {
    if (!previewArticleRef.current) return
    try {
      const payload = prepared ?? {
        html: await preparePreviewArticleForClipboard(previewArticleRef.current),
        plainText: content,
      }
      await copyPreparedArticle(payload.html, payload.plainText)
      setPendingPublicationCopy(undefined)
      setToastMessage('已复制到剪贴板')
    } catch (error) {
      setToastMessage(error instanceof Error && error.message.includes('富文本') ? error.message : '复制失败，请检查剪贴板权限')
    }
    setToastOpen(true)
  }

  const copyArticle = async () => {
    if (!content.trim()) {
      setToastMessage('文章内容为空')
      setToastOpen(true)
      return
    }

    if (!previewArticleRef.current) return

    const request = ++copyPreparationRequestRef.current
    const sourceHtml = serializePreviewArticle(previewArticleRef.current)
    const requestedArticleId = selectedId
    const requestedContent = content
    const requestedPublicationVersion = publicationVersion
    const requestedViewport = `${window.innerWidth}:${window.innerHeight}:${window.devicePixelRatio}`
    try {
      const payload = {
        html: await prepareSerializedArticleForClipboard(sourceHtml),
        plainText: requestedContent,
      }
      if (request !== copyPreparationRequestRef.current) return
      const currentArticle = latestSnapshotRef.current.articles.find((article) => article.id === requestedArticleId)
      const currentViewport = `${window.innerWidth}:${window.innerHeight}:${window.devicePixelRatio}`
      if (latestSnapshotRef.current.selectedId !== requestedArticleId || currentArticle?.content !== requestedContent || latestPublicationVersionRef.current !== requestedPublicationVersion || currentViewport !== requestedViewport) {
        setPendingPublicationCopy(undefined)
        setToastMessage('文章已发生变化，请重新复制')
        setToastOpen(true)
        return
      }
      const issues = [
        ...inspectPublication(previewArticleRef.current, content),
        ...validateWechatHtml(payload.html),
      ]
      if (issues.length) {
        setPendingPublicationCopy(payload)
        setPublicationIssues(issues)
        return
      }
      await performCopy(payload)
    } catch {
      setToastMessage('复制前检查失败，请确认图片资源可以读取')
      setToastOpen(true)
    }
  }

  const exportMarkdown = async () => {
    if (!selectedArticle) return
    try {
      const result = await files.saveText(createMarkdownExport(selectedArticle.title, selectedArticle.content))
      if (result === 'saved') {
        setToastMessage('Markdown 已导出')
        setToastOpen(true)
      }
    } catch {
      setToastMessage('Markdown 导出失败，请稍后重试')
      setToastOpen(true)
    }
  }

  const exportHtml = async () => {
    if (!selectedArticle || !previewArticleRef.current) return
    try {
      let remoteImagesNotInlined = 0
      const articleHtml = await makeImageSourcesPortable(serializePreviewArticle(previewArticleRef.current), async (source) => {
        if (/^https?:\/\//.test(source)) {
          try {
            const response = await (services?.imageFetcher ?? (async (target) => fetch(`/api/assets/fetch?url=${encodeURIComponent(String(target))}`)))(source)
            if (!response.ok) throw new Error('图片下载失败')
            const blob = await response.blob()
            return await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.addEventListener('load', () => resolve(String(reader.result)))
              reader.addEventListener('error', () => reject(reader.error))
              reader.readAsDataURL(blob)
            })
          } catch { remoteImagesNotInlined += 1; return undefined }
        }
        let assetId = Object.entries(assetUrls).find(([, url]) => url === source)?.[0]
        if (!assetId && source.startsWith('asset://')) assetId = decodeURIComponent(source.slice('asset://'.length))
        if (!assetId || !imageRepository) return undefined
        const asset = await imageRepository.get(assetId)
        if (!asset) return undefined
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.addEventListener('load', () => resolve(String(reader.result)))
          reader.addEventListener('error', () => reject(reader.error))
          reader.readAsDataURL(asset.blob)
        })
      })
      const result = await files.saveText(createHtmlExport(selectedArticle.title, articleHtml))
      if (result === 'cancelled') return
      setToastMessage(remoteImagesNotInlined ? `HTML 已导出，${remoteImagesNotInlined} 张远程图片保留网络地址` : '带排版和内联图片的 HTML 已导出')
    } catch {
      setToastMessage('HTML 导出失败，请稍后重试')
    }
    setToastOpen(true)
  }

  const backupWorkspace = async () => {
    try {
      const assetMetadata = await imageRepository?.list() ?? []
      const storedAssets = (await Promise.all(assetMetadata.map(({ id }) => imageRepository!.get(id)))).filter((asset) => asset !== null)
      const backup = await createWorkspaceBackup(latestSnapshotRef.current, await versionsRepository?.listAll() ?? [], storedAssets)
      const now = new Date()
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const result = await files.saveBytes({
        filename: `WeChat-md-backup-${localDate}.wechatmd`,
        mimeType: backup.type,
        bytes: new Uint8Array(await backup.arrayBuffer()),
      })
      if (result === 'cancelled') return
      setToastMessage('工作区备份已导出')
    } catch {
      setToastMessage('工作区备份失败，请稍后重试')
    }
    setToastOpen(true)
  }

  const restoreWorkspaceBackup = async (file: Blob) => {
    const savedAssetIds: string[] = []
    const importedArticleIds: string[] = []
    try {
      const imported = await readWorkspaceBackup(file)
      const merged = mergeWorkspaceBackup(latestSnapshotRef.current, imported, {
        existingAssetIds: (await imageRepository?.list() ?? []).map(({ id }) => id), existingStyleIds: stylePresets.map(({ id }) => id),
        existingTemplateIds: templates.map(({ id }) => id), existingComponentIds: contentComponents.map(({ id }) => id),
      })
      importedArticleIds.push(...merged.snapshot.articles.slice(0, imported.snapshot.articles.length).map(({ id }) => id))
      for (const asset of merged.assets) { await imageRepository?.save(asset); savedAssetIds.push(asset.id) }
      await saveVersions(merged.versions)
      await repository?.save(merged.snapshot)
      setArticleList(merged.snapshot.articles)
      setSelectedId(merged.snapshot.selectedId)
      setStylePresets([...builtInStylePresets, ...(merged.snapshot.styles ?? []).filter((preset) => !preset.builtIn)])
      setTemplates([...builtInContentTemplates, ...(merged.snapshot.templates ?? []).filter((template) => !template.builtIn)])
      setContentComponents([...builtInContentComponents, ...(merged.snapshot.components ?? []).filter((component) => !component.builtIn)])
      setWechatSavePolicy(merged.snapshot.wechatArticleSavePolicy ?? 'ask')
      setSyncEnabled(merged.snapshot.syncEnabled ?? true)
      setSaveStatus('saving')
      setToastMessage(`已安全合并 ${imported.snapshot.articles.length} 篇文章和 ${imported.assets.length} 张图片`)
    } catch (reason) {
      await Promise.all(savedAssetIds.map((id) => imageRepository?.delete(id)))
      await deleteVersionsForArticles(importedArticleIds)
      setToastMessage(reason instanceof Error ? reason.message : '备份恢复失败')
    }
    setToastOpen(true)
  }

  const openWorkspaceBackup = async () => {
    try {
      const file = await files.openBytes({ title: '恢复 WeChat MD 备份', filters: [{ name: 'WeChat MD 备份', extensions: ['wechatmd'] }] })
      if (file) await restoreWorkspaceBackup(new Blob([file.bytes.slice().buffer], { type: 'application/x-wechatmd' }))
    } catch (reason) {
      setToastMessage(reason instanceof Error ? reason.message : '备份恢复失败')
      setToastOpen(true)
    }
  }

  const restoreRecoveryDraft = () => {
    const snapshot = acceptRecovery()
    if (!snapshot) return
    setArticleList((current) => current.map((article) => article.id === snapshot.articleId ? {
      ...article,
      title: snapshot.title,
      titleMode: 'manual',
      content: snapshot.content,
      styleId: snapshot.styleId,
      layoutId: snapshot.layoutId,
      date: '刚刚',
    } : article))
    setSelectedId(snapshot.articleId)
    setSelectedComponentText('')
    setStyleDraft(null)
    setToastMessage('已恢复异常退出前的草稿')
    setToastOpen(true)
  }

  const discardRecoveryDraft = async () => {
    await ignoreRecovery()
    setToastMessage('已忽略恢复草稿')
    setToastOpen(true)
  }

  if (!storageReady) {
    return (
      <main className={styles.app} data-runtime={runtime}>
        {runtime === 'web' && <TitleBar />}
        <div className={styles.loading} role="status">正在恢复本地文章…</div>
      </main>
    )
  }

  return (
    <main className={styles.app} data-runtime={runtime}>
      {runtime === 'web' && <TitleBar />}
      <Dialog open={pendingRecovery !== null} onOpenChange={() => undefined} title="发现未保存的草稿">
        <div className={styles.draftDialogBody}>
          <p>上次可能在保存前意外退出。是否恢复“{pendingRecovery?.title}”的最新编辑内容？</p>
          <div>
            <Button onClick={() => { void discardRecoveryDraft() }}>忽略</Button>
            <Button variant="primary" onClick={restoreRecoveryDraft}>恢复草稿</Button>
          </div>
        </div>
      </Dialog>
      <Toolbar
        onNewArticle={() => requestWorkspaceAction({ type: 'new' })}
        onImport={() => { void openMarkdownArticle() }}
        onExtract={() => setWechatExtractOpen(true)}
        onCopy={copyArticle}
        saveStatus={saveStatus}
        savedAt={savedAt}
        styles={stylePresets}
        activeStyleId={activeStyle.id}
        onStyleSelect={requestStyleApplication}
        onManageStyles={openStyleLibrary}
        layouts={builtInLayouts}
        activeLayoutId={activeLayoutId}
        onLayoutSelect={applyLayoutToCurrentArticle}
        contentTemplates={templates}
        onContentTemplateSelect={createArticleFromTemplate}
        onSaveCurrentTemplate={openSaveTemplate}
        onManageTemplates={() => setTemplateLibraryOpen(true)}
        onOpenPreviewSettings={openPageSettings}
        onManageAssets={openAssetLibrary}
        onOpenVersionHistory={() => openVersionHistory()}
        onExportMarkdown={() => { void exportMarkdown() }}
        onExportHtml={() => { void exportHtml() }}
        onBackupWorkspace={() => { void backupWorkspace() }}
        onRestoreBackup={() => { void openWorkspaceBackup() }}
      />
      <div className={styles.workspace} role="region" aria-label="编辑工作区" data-settings-open={settingsOpen} data-editor-fullscreen={editorFullscreen}>
        <Sidebar
          articles={articleList}
          selectedId={selectedId}
          onSelect={selectArticle}
          onRename={openArticleRename}
          onDuplicate={duplicateArticle}
          onToggleFavorite={toggleArticleFavorite}
          onMoveToTrash={moveArticleToTrash}
          onRestore={restoreArticle}
          onDelete={setDeleteTarget}
          onTogglePublished={toggleArticlePublished}
          onOpenSettings={runtime === 'desktop' ? () => { void openSoftwareSettings() } : openPageSettings}
          onOpenHistory={openVersionHistory}
        />
        <EditorPanel
          ref={editorPanelRef}
          value={content}
          onChange={updateContent}
          tab={editorTab}
          onTabChange={setEditorTab}
          onSelectionChange={(selection, origin) => {
            previewPanelRef.current?.resumeFollowing()
            setEditorSelection(selection)
            if (selection.text.trim()) setSelectedComponentText(selection.text)
            if (origin === 'user') previewPanelRef.current?.revealLines(selection.startLine, selection.endLine)
          }}
          onUserInteraction={() => previewPanelRef.current?.resumeFollowing()}
          fullscreen={editorFullscreen}
          onFullscreenChange={setEditorFullscreen}
          onScrollRatioChange={(ratio) => { if (syncEnabled) previewPanelRef.current?.setScrollRatio(ratio) }}
          onImageFiles={(files, source) => { void importImageFiles(files, source) }}
        />
        <PreviewPanel
          ref={previewPanelRef}
          markdown={previewMarkdown}
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
          onOpenPageSettings={openPageSettings}
          onCopy={() => { void copyArticle() }}
          stylePreset={previewStyle}
          layoutId={activeLayoutId}
        />
        <SettingsPanel
          open={settingsOpen}
          tab={settingsTab}
          onTabChange={setSettingsTab}
          pageWidth={[previewStyle.global.contentWidth]}
          onPageWidthChange={(value) => changeStyleValue('global.contentWidth', value[0])}
          onClose={() => setRightSidebarOpen(false)}
          stylePreset={previewStyle}
          styles={stylePresets}
          activeStyleId={activeStyle.id}
          libraryRequest={styleLibraryRequest}
          styleDirty={styleDraft !== null}
          onStyleValueChange={changeStyleValue}
          onStyleSelect={requestStyleApplication}
          onDiscardStyleChanges={() => setStyleDraft(null)}
          onSaveStyle={saveStyleDraft}
          onRenameStyle={renameStyle}
          onDeleteStyle={deleteStyle}
          onResetStyle={resetStyle}
          components={contentComponents}
          selectedText={selectedComponentText}
          onInsertComponent={insertComponent}
          onSaveComponent={saveSelectedComponent}
          onRenameComponent={renameComponent}
          onDeleteComponent={deleteComponent}
          wechatArticleSavePolicy={wechatSavePolicy}
          onWechatArticleSavePolicyChange={(policy) => { setWechatSavePolicy(policy); setSaveStatus('saving') }}
        />
      </div>
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen} title="保存为模板">
        <div className={styles.draftDialogBody}>
          <p>保存当前正文和版式，之后可从顶部“模板”菜单用它新建文章。</p>
          <label><span>模板名称</span><Input aria-label="模板名称" value={templateName} onChange={(event) => setTemplateName(event.target.value)} /></label>
          <div><Button onClick={() => setSaveTemplateOpen(false)}>取消</Button><Button variant="primary" disabled={!templateName.trim()} onClick={saveCurrentTemplate}>保存模板</Button></div>
        </div>
      </Dialog>
      <TemplateLibraryDialog
        open={templateLibraryOpen}
        onOpenChange={setTemplateLibraryOpen}
        templates={templates}
        onUse={createArticleFromTemplate}
        onRename={renameTemplate}
        onDelete={deleteTemplate}
      />
      <AssetLibraryDialog
        open={assetLibraryOpen}
        onOpenChange={setAssetLibraryOpen}
        assets={resourceAssets}
        assetUrls={{ ...resourceAssetUrls, ...assetUrls }}
        currentArticleIds={collectImageAssetIds(content)}
        onInsert={insertStoredAsset}
        onImportFiles={(files) => { void importImageFiles(files, 'file') }}
        onImportUrl={(url) => { void importNetworkImage(url) }}
        onRemoveFromArticle={removeAssetFromCurrentArticle}
        onDelete={(id) => { void deleteUnusedAsset(id) }}
      />
      {services?.imageArchive ? <SoftwareSettingsDialog
        open={softwareSettingsOpen}
        directory={imageSaveDirectory}
        busy={softwareSettingsBusy}
        onOpenChange={setSoftwareSettingsOpen}
        onChooseDirectory={() => { void chooseImageSaveDirectory() }}
        onResetDirectory={() => { void resetImageSaveDirectory() }}
        onOpenDirectory={() => { void openImageSaveDirectory() }}
      /> : null}
      <VersionHistoryDialog
        open={versionHistoryOpen}
        onOpenChange={setVersionHistoryOpen}
        versions={articleVersions}
        currentArticle={{ title: selectedArticle?.title ?? '', content, styleId: activeStyle.id, styleSnapshot: previewStyle }}
        onSaveCurrent={() => { void saveCurrentVersion() }}
        onRestore={(versionId) => { void restoreArticleVersion(versionId) }}
      />
      <WechatExtractDialog
        open={wechatExtractOpen}
        onOpenChange={setWechatExtractOpen}
        extractor={wechatExtractor}
        savePolicy={wechatSavePolicy}
        onApply={applyWechatStyle}
        onMerge={mergeWechatStyle}
        onSaveStyle={saveWechatStyle}
        onSaveArticle={saveWechatArticle}
        onSavePolicyChange={(policy) => { setWechatSavePolicy(policy); setSaveStatus('saving') }}
      />
      <Dialog open={publicationIssues.length > 0} onOpenChange={(open) => { if (!open) { setPublicationIssues([]); setPendingPublicationCopy(undefined) } }} title="发布前检查">
        <div className={styles.draftDialogBody}>
          <p>复制前发现以下兼容性问题。微信公众号可能清洗部分结构或样式，请根据建议处理：</p>
          <ul className={styles.publicationIssues}>{publicationIssues.map((issue, index) => {
            const level = 'level' in issue ? issue.level : 'error'
            const suggestion = 'suggestion' in issue ? issue.suggestion : undefined
            const label = level === 'error' ? '错误' : level === 'warning' ? '警告' : '提示'
            return <li key={`${issue.code}-${index}`} data-level={level}>
              <strong>{label}</strong>
              <span>{issue.message}</span>
              {suggestion ? <small>{suggestion}</small> : null}
            </li>
          })}</ul>
          <div>
            <Button onClick={() => { setPublicationIssues([]); setPendingPublicationCopy(undefined) }}>返回检查</Button>
            <Button variant="primary" onClick={() => { setPublicationIssues([]); void performCopy() }}>仍然复制</Button>
          </div>
        </div>
      </Dialog>
      <Dialog open={draftGuardOpen} onOpenChange={(open) => { if (open) setDraftGuardOpen(true); else cancelDraftGuard() }} title="未保存的风格修改">
        <div className={styles.draftDialogBody}>
          <p>当前排版调整尚未保存。放弃后将无法恢复。</p>
          {activeStyle.builtIn ? <label><span>风格名称</span><Input aria-label="风格名称" value={guardStyleName} onChange={(event) => setGuardStyleName(event.target.value)} /></label> : null}
          <div>
            <Button onClick={cancelDraftGuard}>取消</Button>
            <Button onClick={discardDraftAndContinue}>放弃并继续</Button>
            <Button variant="primary" disabled={activeStyle.builtIn && !guardStyleName.trim()} onClick={saveDraftAndContinue}>保存并继续</Button>
          </div>
        </div>
      </Dialog>
      <Dialog open={renameTarget !== undefined} onOpenChange={(open) => { if (!open) setRenameTarget(undefined) }} title="重命名文章">
        <div className={styles.draftDialogBody}>
          <label><span>文章标题</span><Input aria-label="文章标题" value={renameTitle} onChange={(event) => setRenameTitle(event.target.value)} /></label>
          <div>
            <Button onClick={() => setRenameTarget(undefined)}>取消</Button>
            <Button variant="primary" disabled={!renameTitle.trim()} onClick={renameArticle}>保存名称</Button>
          </div>
        </div>
      </Dialog>
      <Dialog open={deleteTarget !== undefined} onOpenChange={(open) => { if (!open) setDeleteTarget(undefined) }} title="永久删除文章">
        <div className={styles.draftDialogBody}>
          <p>“{deleteTarget?.title}”将从本地文章库中永久删除，此操作无法撤销。</p>
          <div>
            <Button onClick={() => setDeleteTarget(undefined)}>取消</Button>
            <Button variant="primary" onClick={deleteArticlePermanently}>确认删除</Button>
          </div>
        </div>
      </Dialog>
      <Toast open={toastOpen} onOpenChange={setToastOpen} message={toastMessage} />
    </main>
  )
}
