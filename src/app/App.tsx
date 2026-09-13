import { useEffect, useMemo, useRef, useState } from 'react'
import { TitleBar } from '../components/chrome/TitleBar'
import { Toolbar } from '../components/chrome/Toolbar'
import { EditorPanel, type EditorPanelHandle, type EditorSelection } from '../components/editor/EditorPanel'
import { PreviewPanel, type PreviewDevice, type PreviewPanelHandle } from '../components/preview/PreviewPanel'
import { SettingsPanel } from '../components/settings/SettingsPanel'
import { Sidebar } from '../components/sidebar/Sidebar'
import { TemplateLibraryDialog } from '../components/templates/TemplateLibraryDialog'
import { WechatExtractDialog, type WechatArticleSavePolicy } from '../components/wechat/WechatExtractDialog'
import { AssetLibraryDialog } from '../components/assets/AssetLibraryDialog'
import { VersionHistoryDialog } from '../components/versions/VersionHistoryDialog'
import { Button, Dialog, Input, Toast } from '../components/ui'
import { copyPreviewArticle, makeImageSourcesPortable, serializePreviewArticle } from '../features/clipboard/richTextClipboard'
import { createHtmlExport, createMarkdownExport, downloadTextExport } from '../features/export/articleExport'
import { createWorkspaceBackup, mergeWorkspaceBackup, readWorkspaceBackup } from '../features/backup/workspaceBackup'
import { inspectPublication, type PublicationIssue } from '../features/publication/publicationPreflight'
import { createBrowserArticleRepository, type ArticleRepository } from '../features/articles/articleRepository'
import { collectImageAssetIds, createImageMarkdown, localizeRemoteMarkdownImages, removeImageAssetReference, replaceImageAssetUrls } from '../features/assets/assetMarkdown'
import { createBrowserAssetRepository, type AssetRepository, type ImageAsset } from '../features/assets/assetRepository'
import { createStoredImageAsset, fetchImageAsset } from '../features/assets/imageAssets'
import { builtInStylePresets, duplicateStylePreset, updateStylePreset, type StylePreset, type StyleValuePath } from '../features/styles/stylePresets'
import { builtInTemplates, createCustomTemplate, type ArticleTemplate } from '../features/templates/templatePresets'
import { builtInContentComponents, createCustomContentComponent, type ContentComponent } from '../features/components/contentComponents'
import { applyExtractedStyle, extractWechatArticle, type ExtractedWechatArticle } from '../features/wechat/wechatExtraction'
import { createArticleVersion, shouldCreateAutomaticVersion, type ArticleVersion, type ArticleVersionReason } from '../features/versions/articleVersions'
import { createBrowserVersionRepository, type VersionRepository } from '../features/versions/versionRepository'
import { createVersionWriteQueue } from '../features/versions/versionWriteQueue'
import { articles, type ArticleItem } from './demoData'
import type { RuntimeServices } from '../platform/contracts'
import styles from './App.module.css'

let articleSequence = 0
let styleSequence = 0
let templateSequence = 0
let componentSequence = 0

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

type PendingWorkspaceAction =
  | { type: 'template'; templateId: string }
  | { type: 'import'; file: File }

export interface AppProps {
  services?: RuntimeServices
  articleRepository?: ArticleRepository
  assetRepository?: AssetRepository
  versionRepository?: VersionRepository
  saveDelay?: number
  wechatExtractor?: (url: string) => Promise<ExtractedWechatArticle>
}

export function App({ services, articleRepository, assetRepository, versionRepository, saveDelay = 5000, wechatExtractor: wechatExtractorProp }: AppProps = {}) {
  const repository = useMemo(() => services ? services.articleRepository : articleRepository ?? createBrowserArticleRepository(), [articleRepository, services])
  const imageRepository = useMemo(() => services ? services.assetRepository : assetRepository ?? createBrowserAssetRepository(), [assetRepository, services])
  const versionsRepository = useMemo(() => services ? services.versionRepository : versionRepository ?? createBrowserVersionRepository(), [services, versionRepository])
  const wechatExtractor = services?.extractWechatArticle ?? wechatExtractorProp ?? extractWechatArticle
  const [articleList, setArticleList] = useState<ArticleItem[]>(() => articles.map((article) => ({ ...article })))
  const [selectedId, setSelectedId] = useState(articles[0].id)
  const [editorTab, setEditorTab] = useState('edit')
  const [settingsTab, setSettingsTab] = useState('layout')
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  const [stylePresets, setStylePresets] = useState<StylePreset[]>(() => builtInStylePresets)
  const [templates, setTemplates] = useState<ArticleTemplate[]>(() => builtInTemplates)
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
  const [publicationIssues, setPublicationIssues] = useState<PublicationIssue[]>([])
  const [renameTarget, setRenameTarget] = useState<ArticleItem>()
  const [renameTitle, setRenameTitle] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ArticleItem>()
  const [wechatExtractOpen, setWechatExtractOpen] = useState(false)
  const [assetLibraryOpen, setAssetLibraryOpen] = useState(false)
  const [resourceAssets, setResourceAssets] = useState<ImageAsset[]>([])
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)
  const [articleVersions, setArticleVersions] = useState<ArticleVersion[]>([])
  const [wechatSavePolicy, setWechatSavePolicy] = useState<WechatArticleSavePolicy>('ask')
  const [storageReady, setStorageReady] = useState(repository === null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedAt, setSavedAt] = useState<Date>()
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({})
  const [resourceAssetUrls, setResourceAssetUrls] = useState<Record<string, string>>({})
  const resourceObjectUrlsRef = useRef<string[]>([])
  const sidebarToggleStarted = useRef(false)
  const previewArticleRef = useRef<HTMLElement>(null)
  const editorPanelRef = useRef<EditorPanelHandle>(null)
  const previewPanelRef = useRef<PreviewPanelHandle>(null)
  const latestSnapshotRef = useRef({ articles: articleList, selectedId, styles: [] as StylePreset[], templates: [] as ArticleTemplate[], components: [] as ContentComponent[], wechatArticleSavePolicy: wechatSavePolicy, syncEnabled })
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const versionWriteQueueRef = useRef(createVersionWriteQueue())
  const versionBaselinesRef = useRef(new Map<string, ArticleVersion>(articles.map((article) => [article.id, {
    id: `baseline-${article.id}`, articleId: article.id, title: article.title, content: article.content, styleId: article.styleId,
    styleSnapshot: builtInStylePresets.find((style) => style.id === (article.styleId ?? 'default')), createdAt: new Date().toISOString(), reason: 'automatic' as const,
  }])))
  const saveRequestRef = useRef(0)
  const mountedRef = useRef(true)
  const selectedArticle = articleList.find((article) => article.id === selectedId)
  const previousSelectedArticleRef = useRef<ArticleItem | undefined>(selectedArticle)
  const content = selectedArticle?.content ?? ''
  const previewMarkdown = useMemo(() => replaceImageAssetUrls(content, assetUrls), [assetUrls, content])
  const activeStyleId = selectedArticle?.styleId ?? 'default'
  const activeStyle = stylePresets.find((preset) => preset.id === activeStyleId) ?? builtInStylePresets[0]
  const previewStyle = styleDraft ?? activeStyle
  latestSnapshotRef.current = {
    articles: articleList,
    selectedId,
    styles: stylePresets.filter((preset) => !preset.builtIn),
    templates: templates.filter((template) => !template.builtIn),
    components: contentComponents.filter((component) => !component.builtIn),
    wechatArticleSavePolicy: wechatSavePolicy,
    syncEnabled,
  }

  const enqueueSave = (snapshot = latestSnapshotRef.current) => {
    if (!repository) return Promise.resolve()
    const request = ++saveRequestRef.current
    const operation = saveQueueRef.current
      .catch(() => undefined)
      .then(() => repository.save(snapshot))
    saveQueueRef.current = operation
    operation.then(() => {
      if (!mountedRef.current || request !== saveRequestRef.current) return
      setSaveStatus('saved')
      setSavedAt(new Date())
    }).catch(() => {
      if (mountedRef.current && request === saveRequestRef.current) setSaveStatus('error')
    })
    return operation
  }

  const createDueAutomaticVersions = (snapshot = latestSnapshotRef.current) => {
    if (!versionsRepository) return Promise.resolve()
    return versionWriteQueueRef.current.run(async () => {
      for (const article of snapshot.articles) {
        const state = { ...article, styleSnapshot: stylePresets.find((style) => style.id === (article.styleId ?? 'default')) }
        const latest = (await versionsRepository.list(article.id))[0] ?? versionBaselinesRef.current.get(article.id)
        if (!latest) {
          versionBaselinesRef.current.set(article.id, { ...createArticleVersion(article.id, state, 'automatic'), id: `baseline-${article.id}` })
        } else if (shouldCreateAutomaticVersion(latest, state)) {
          await versionsRepository.save(createArticleVersion(article.id, state, 'automatic'))
        }
      }
    })
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (typeof URL.revokeObjectURL === 'function') resourceObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  useEffect(() => {
    if (!repository) return
    let active = true
    repository.load()
      .then((snapshot) => {
        if (!active) return
        if (snapshot?.articles.length) {
          const restoredStyles = [...builtInStylePresets, ...(snapshot.styles ?? []).filter((preset) => !preset.builtIn)]
          setArticleList(snapshot.articles)
          setStylePresets(restoredStyles)
          setTemplates([...builtInTemplates, ...(snapshot.templates ?? []).filter((template) => !template.builtIn)])
          setContentComponents([...builtInContentComponents, ...(snapshot.components ?? []).filter((component) => !component.builtIn)])
          setWechatSavePolicy(snapshot.wechatArticleSavePolicy ?? 'ask')
          setSyncEnabled(snapshot.syncEnabled ?? true)
          const restoredId = snapshot.articles.some((article) => article.id === snapshot.selectedId)
            ? snapshot.selectedId
            : snapshot.articles[0].id
          setSelectedId(restoredId)
          previousSelectedArticleRef.current = snapshot.articles.find((article) => article.id === restoredId)
          const observedAt = new Date().toISOString()
          versionBaselinesRef.current = new Map(snapshot.articles.map((article) => [article.id, {
            id: `baseline-${article.id}`, articleId: article.id, title: article.title, content: article.content, styleId: article.styleId,
            styleSnapshot: restoredStyles.find((style) => style.id === (article.styleId ?? 'default')), createdAt: observedAt, reason: 'automatic' as const,
          }]))
        }
        setSaveStatus('saved')
        setSavedAt(new Date())
      })
      .catch(() => {
        if (active) setSaveStatus('error')
      })
      .finally(() => {
        if (active) setStorageReady(true)
      })
    return () => { active = false }
  }, [repository])

  useEffect(() => {
    if (!repository || !storageReady) return
    const timeout = window.setTimeout(() => {
      const snapshot = {
        articles: articleList,
        selectedId,
        styles: stylePresets.filter((preset) => !preset.builtIn),
        templates: templates.filter((template) => !template.builtIn),
        components: contentComponents.filter((component) => !component.builtIn),
        wechatArticleSavePolicy: wechatSavePolicy,
        syncEnabled,
      }
      void enqueueSave(snapshot).then(() => createDueAutomaticVersions(snapshot))
    }, saveDelay)
    return () => window.clearTimeout(timeout)
  }, [articleList, contentComponents, repository, saveDelay, selectedId, storageReady, stylePresets, syncEnabled, templates, versionsRepository, wechatSavePolicy])

  useEffect(() => {
    if (!storageReady || !versionsRepository) return
    const interval = window.setInterval(() => { void createDueAutomaticVersions() }, 60_000)
    return () => window.clearInterval(interval)
  }, [storageReady, stylePresets, versionsRepository])

  useEffect(() => {
    if (!repository || !storageReady) return
    const flush = () => { void enqueueSave(latestSnapshotRef.current) }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [repository, storageReady])

  useEffect(() => {
    let active = true
    const objectUrls: string[] = []
    const ids = collectImageAssetIds(content)
    if (!imageRepository || ids.length === 0) {
      setAssetUrls({})
      return () => { active = false }
    }
    Promise.all(ids.map(async (id) => [id, await imageRepository.get(id)] as const)).then((entries) => {
      if (!active) return
      const urls: Record<string, string> = {}
      entries.forEach(([id, asset]) => {
        if (!asset || typeof URL.createObjectURL !== 'function') return
        const url = URL.createObjectURL(asset.blob)
        objectUrls.push(url)
        urls[id] = url
      })
      setAssetUrls(urls)
    }).catch(() => { if (active) setAssetUrls({}) })
    return () => {
      active = false
      if (typeof URL.revokeObjectURL === 'function') objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [content, imageRepository])

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

  const saveVersionIfChanged = async (reason: ArticleVersionReason, article: ArticleItem) => {
    if (!versionsRepository || !article.content.trim()) return
    const state = { ...article, styleSnapshot: stylePresets.find((style) => style.id === (article.styleId ?? 'default')) }
    return versionWriteQueueRef.current.run(async () => {
      const latest = (await versionsRepository.list(article.id))[0]
      if (latest?.title === state.title && latest.content === state.content && latest.styleId === state.styleId && JSON.stringify(latest.styleSnapshot) === JSON.stringify(state.styleSnapshot)) return
      await versionsRepository.save(createArticleVersion(article.id, state, reason))
      if (versionHistoryOpen && article.id === selectedId) setArticleVersions(await versionsRepository.list(article.id))
    })
  }

  const openVersionHistory = (articleId = selectedId) => {
    if (articleId !== selectedId && articleList.some((article) => article.id === articleId)) setSelectedId(articleId)
    setVersionHistoryOpen(true)
    void versionsRepository?.list(articleId).then(setArticleVersions)
  }

  const saveCurrentVersion = async () => {
    const article = articleList.find((item) => item.id === selectedId)
    if (!article || !versionsRepository) return
    const operation = versionWriteQueueRef.current.run(() => versionsRepository.save(createArticleVersion(article.id, {
      ...article, styleSnapshot: stylePresets.find((style) => style.id === (article.styleId ?? 'default')),
    }, 'manual')))
    await operation
    setArticleVersions(await versionsRepository.list(article.id))
    setToastMessage('已保存当前版本')
    setToastOpen(true)
  }

  const restoreArticleVersion = async (versionId: string) => {
    if (!versionsRepository || !selectedArticle) return
    const target = await versionsRepository.get(versionId)
    if (!target || target.articleId !== selectedArticle.id) return
    await saveVersionIfChanged('restore', selectedArticle)
    let restoredStyleId = target.styleId
    if (target.styleSnapshot) {
      styleSequence += 1
      restoredStyleId = `restored-style-${Date.now()}-${styleSequence}`
      const restoredStyle = { ...target.styleSnapshot, id: restoredStyleId, name: `${target.styleSnapshot.name}（历史）`, builtIn: false }
      setStylePresets((current) => [...current, restoredStyle])
    }
    setArticleList((current) => current.map((article) => article.id === target.articleId ? {
      ...article, title: target.title, titleMode: 'manual', content: target.content, styleId: restoredStyleId, date: '刚刚',
    } : article))
    setSaveStatus('saving')
    setArticleVersions(await versionsRepository.list(target.articleId))
    setToastMessage('已恢复历史版本')
    setToastOpen(true)
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

  const updateContent = (nextContent: string) => {
    setSelectedComponentText('')
    setSaveStatus('saving')
    setArticleList((current) => current.map((article) => {
      if (article.id !== selectedId) return article
      const heading = /^#\s+(.+?)\s*$/m.exec(nextContent)?.[1]
      return {
        ...article,
        content: nextContent,
        date: '刚刚',
        title: article.titleMode === 'auto' && heading ? heading.replace(/\s+#+$/, '') : article.title,
      }
    }))
  }

  const importImageFiles = async (files: File[], source: 'file' | 'paste' | 'drop') => {
    if (!imageRepository) {
      setToastMessage('当前环境无法保存图片')
      setToastOpen(true)
      return
    }
    try {
      const assets = files.map((file) => createStoredImageAsset(file, source))
      await Promise.all(assets.map((asset) => imageRepository.save(asset)))
      setResourceAssets((current) => [...assets.map(({ blob: _blob, ...asset }) => asset), ...current])
      editorPanelRef.current?.insertText(assets.map((asset) => createImageMarkdown(asset.id, asset.name.replace(/\.[^.]+$/, ''))).join('\n\n'))
      setToastMessage(assets.length > 1 ? `已插入 ${assets.length} 张图片` : '图片已插入')
    } catch (reason) {
      setToastMessage(reason instanceof Error ? reason.message : '图片插入失败')
    }
    setToastOpen(true)
  }

  const refreshAssetLibrary = async () => {
    if (!imageRepository) return
    const globallyUsed = new Set(articleList.flatMap((article) => collectImageAssetIds(article.content)))
    const stored = await imageRepository.list()
    await Promise.all(stored.map((asset) => imageRepository.setUnused(asset.id, !globallyUsed.has(asset.id))))
    setResourceAssets(stored.map((asset) => ({ ...asset, unused: !globallyUsed.has(asset.id) })))
    if (typeof URL.createObjectURL === 'function') {
      if (typeof URL.revokeObjectURL === 'function') resourceObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      const entries = await Promise.all(stored.map(async (asset) => [asset.id, await imageRepository.get(asset.id)] as const))
      const urls: Record<string, string> = {}
      resourceObjectUrlsRef.current = []
      entries.forEach(([id, storedAsset]) => {
        if (!storedAsset) return
        const objectUrl = URL.createObjectURL(storedAsset.blob)
        urls[id] = objectUrl
        resourceObjectUrlsRef.current.push(objectUrl)
      })
      setResourceAssetUrls(urls)
    }
  }

  const openAssetLibrary = () => {
    setAssetLibraryOpen(true)
    void refreshAssetLibrary()
  }

  const insertStoredAsset = (id: string) => {
    const asset = resourceAssets.find((candidate) => candidate.id === id)
    if (!asset) return
    editorPanelRef.current?.insertText(createImageMarkdown(asset.id, asset.name.replace(/\.[^.]+$/, '')))
    void imageRepository?.setUnused(id, false)
  }

  const saveRemoteAsset = async (url: string, source: 'remote' | 'wechat') => {
    if (!imageRepository) throw new Error('当前环境无法保存图片')
    const asset = await fetchImageAsset(url, source, {
      fetcher: services?.imageFetcher ?? (async (target) => fetch(`/api/assets/fetch?url=${encodeURIComponent(String(target))}`)),
    })
    await imageRepository.save(asset)
    return asset
  }

  const importNetworkImage = async (url: string, source: 'remote' | 'wechat' = 'remote') => {
    if (!imageRepository) return
    try {
      const asset = await saveRemoteAsset(url, source)
      const { blob: _blob, ...assetMetadata } = asset
      setResourceAssets((current) => [assetMetadata, ...current])
      editorPanelRef.current?.insertText(createImageMarkdown(asset.id, asset.name.replace(/\.[^.]+$/, '')))
      setToastMessage('网络图片已保存并插入')
    } catch (reason) {
      setToastMessage(reason instanceof Error ? reason.message : '网络图片下载失败')
    }
    setToastOpen(true)
  }

  const removeAssetFromCurrentArticle = (id: string) => {
    updateContent(removeImageAssetReference(content, id))
    const usedElsewhere = articleList.some((article) => article.id !== selectedId && collectImageAssetIds(article.content).includes(id))
    void imageRepository?.setUnused(id, !usedElsewhere)
    setResourceAssets((current) => current.map((asset) => asset.id === id ? { ...asset, unused: !usedElsewhere } : asset))
  }

  const deleteUnusedAsset = async (id: string) => {
    await imageRepository?.delete(id)
    setResourceAssets((current) => current.filter((asset) => asset.id !== id))
    setToastMessage('未使用图片已永久删除')
    setToastOpen(true)
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

  function createArticleFromTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId)
    if (!template) return
    const heading = /^#\s+(.+?)\s*$/m.exec(template.content)?.[1]?.replace(/\s+#+$/, '')
    const article: ArticleItem = {
      id: createArticleId(),
      title: heading || (template.id === 'blank' ? '未命名文章' : template.name),
      date: '刚刚',
      content: template.content,
      source: 'local',
      status: 'draft',
      titleMode: 'auto',
    }
    setArticleList((current) => [article, ...current])
    setSelectedComponentText('')
    setSelectedId(article.id)
    setSaveStatus('saving')
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
    else createArticleFromTemplate(action.templateId)
  }

  const openSaveTemplate = () => {
    setTemplateName('')
    setSaveTemplateOpen(true)
  }

  const saveCurrentTemplate = () => {
    const name = templateName.trim()
    if (!name) return
    templateSequence += 1
    const template = createCustomTemplate(`template-${Date.now()}-${templateSequence}`, name, content)
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
    void versionWriteQueueRef.current.run(async () => { await versionsRepository?.deleteForArticle(deletedId) })
    setDeleteTarget(undefined)
    setSaveStatus('saving')
  }

  const importArticle = async (file: File) => {
    try {
      const markdown = await readFileText(file)
      const title = file.name.replace(/\.(?:md|markdown|txt)$/i, '') || '导入文章'
      const article: ArticleItem = { id: createArticleId(), title, date: '刚刚', content: markdown, source: 'imported', status: 'draft', titleMode: 'manual' }
      setArticleList((current) => [article, ...current])
      setSelectedComponentText('')
      setSelectedId(article.id)
      setSaveStatus('saving')
      setToastMessage('Markdown 已导入')
      setToastOpen(true)
    } catch {
      setToastMessage('文件读取失败')
      setToastOpen(true)
    }
  }

  const saveWechatArticle = async (extraction: ExtractedWechatArticle) => {
    const localized = await localizeRemoteMarkdownImages(
      extraction.markdown,
      async (url) => (await saveRemoteAsset(url, 'wechat')).id,
    )
    const markdown = /^#\s+/m.test(localized.markdown)
      ? localized.markdown
      : `# ${extraction.title}\n\n${localized.markdown}`.trim()
    const article: ArticleItem = {
      id: createArticleId(),
      title: extraction.title,
      date: '刚刚',
      content: markdown,
      source: 'wechat',
      status: 'draft',
      titleMode: 'manual',
      author: extraction.author,
      sourceUrl: extraction.sourceUrl,
      importedAt: new Date().toISOString(),
      originalHtml: extraction.html,
    }
    setArticleList((current) => [article, ...current])
    setSelectedComponentText('')
    setSelectedId(article.id)
    setSaveStatus('saving')
    setToastMessage(localized.failedUrls.length
      ? `文章已保存，${localized.failedUrls.length} 张图片下载失败并保留原链接`
      : `已保存公众号文章“${extraction.title}”`)
    setToastOpen(true)
  }

  const applyWechatStyle = (extraction: ExtractedWechatArticle, selectedPaths: StyleValuePath[]) => {
    setStyleDraft(applyExtractedStyle(activeStyle, extraction, selectedPaths))
    setSettingsTab('layout')
    setToastMessage(selectedPaths.length === extraction.tokens.length ? '已应用整套提取风格' : '已应用所选提取样式')
    setToastOpen(true)
  }

  const mergeWechatStyle = (extraction: ExtractedWechatArticle, selectedPaths: StyleValuePath[]) => {
    setStyleDraft(applyExtractedStyle(styleDraft ?? activeStyle, extraction, selectedPaths))
    setSettingsTab('layout')
    setToastMessage('已合并到当前风格，保存后长期使用')
    setToastOpen(true)
  }

  const saveWechatStyle = (extraction: ExtractedWechatArticle, selectedPaths: StyleValuePath[], name: string) => {
    styleSequence += 1
    const mapped = applyExtractedStyle(activeStyle, extraction, selectedPaths)
    const saved = duplicateStylePreset(mapped, `wechat-style-${Date.now()}-${styleSequence}`, name)
    saved.description = `提取自“${extraction.title}”`
    setStylePresets((current) => [...current, saved])
    setArticleList((current) => current.map((article) => article.id === selectedId ? { ...article, styleId: saved.id } : article))
    setStyleDraft(null)
    setSaveStatus('saving')
    setToastMessage(`已保存并应用“${name}”`)
    setToastOpen(true)
  }

  const performCopy = async () => {
    if (!previewArticleRef.current) return
    try {
      await copyPreviewArticle(previewArticleRef.current, content)
      setToastMessage('已复制到剪贴板')
    } catch {
      setToastMessage('复制失败，请检查剪贴板权限')
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

    const issues = inspectPublication(previewArticleRef.current, content)
    if (issues.length) {
      setPublicationIssues(issues)
      return
    }
    await performCopy()
  }

  const exportMarkdown = () => {
    if (!selectedArticle) return
    downloadTextExport(createMarkdownExport(selectedArticle.title, selectedArticle.content))
    setToastMessage('Markdown 已导出')
    setToastOpen(true)
  }

  const exportHtml = async () => {
    if (!selectedArticle || !previewArticleRef.current) return
    try {
      let remoteImagesNotInlined = 0
      const articleHtml = await makeImageSourcesPortable(serializePreviewArticle(previewArticleRef.current), async (source) => {
        if (/^https?:\/\//.test(source)) {
          try {
            const response = await fetch(`/api/assets/fetch?url=${encodeURIComponent(source)}`)
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
      downloadTextExport(createHtmlExport(selectedArticle.title, articleHtml))
      setToastMessage(remoteImagesNotInlined ? `HTML 已导出，${remoteImagesNotInlined} 张远程图片保留网络地址` : '带排版和内联图片的 HTML 已导出')
    } catch {
      setToastMessage('HTML 导出失败，请稍后重试')
    }
    setToastOpen(true)
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const backupWorkspace = async () => {
    try {
      const assetMetadata = await imageRepository?.list() ?? []
      const storedAssets = (await Promise.all(assetMetadata.map(({ id }) => imageRepository!.get(id)))).filter((asset) => asset !== null)
      const backup = await createWorkspaceBackup(latestSnapshotRef.current, await versionsRepository?.listAll() ?? [], storedAssets)
      const now = new Date()
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      downloadBlob(backup, `WeChat-md-backup-${localDate}.wechatmd`)
      setToastMessage('工作区备份已导出')
    } catch {
      setToastMessage('工作区备份失败，请稍后重试')
    }
    setToastOpen(true)
  }

  const restoreWorkspaceBackup = async (file: File) => {
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
      const versionRestore = versionWriteQueueRef.current.run(async () => {
        for (const version of merged.versions) await versionsRepository?.save(version)
      })
      await versionRestore
      await repository?.save(merged.snapshot)
      setArticleList(merged.snapshot.articles)
      setSelectedId(merged.snapshot.selectedId)
      setStylePresets([...builtInStylePresets, ...(merged.snapshot.styles ?? []).filter((preset) => !preset.builtIn)])
      setTemplates([...builtInTemplates, ...(merged.snapshot.templates ?? []).filter((template) => !template.builtIn)])
      setContentComponents([...builtInContentComponents, ...(merged.snapshot.components ?? []).filter((component) => !component.builtIn)])
      setWechatSavePolicy(merged.snapshot.wechatArticleSavePolicy ?? 'ask')
      setSyncEnabled(merged.snapshot.syncEnabled ?? true)
      setSaveStatus('saving')
      setToastMessage(`已安全合并 ${imported.snapshot.articles.length} 篇文章和 ${imported.assets.length} 张图片`)
    } catch (reason) {
      await Promise.all(savedAssetIds.map((id) => imageRepository?.delete(id)))
      await versionWriteQueueRef.current.run(async () => {
        await Promise.all(importedArticleIds.map((id) => versionsRepository?.deleteForArticle(id)))
      })
      setToastMessage(reason instanceof Error ? reason.message : '备份恢复失败')
    }
    setToastOpen(true)
  }

  if (!storageReady) {
    return (
      <main className={styles.app}>
        <TitleBar />
        <div className={styles.loading} role="status">正在恢复本地文章…</div>
      </main>
    )
  }

  return (
    <main className={styles.app}>
      <TitleBar />
      <Toolbar
        onNewArticle={() => requestWorkspaceAction({ type: 'template', templateId: 'blank' })}
        onImport={(file) => requestWorkspaceAction({ type: 'import', file })}
        onExtract={() => setWechatExtractOpen(true)}
        onCopy={copyArticle}
        saveStatus={saveStatus}
        savedAt={savedAt}
        styles={stylePresets}
        activeStyleId={activeStyle.id}
        onStyleSelect={requestStyleApplication}
        onManageStyles={openStyleLibrary}
        templates={templates}
        onTemplateSelect={(templateId) => requestWorkspaceAction({ type: 'template', templateId })}
        onSaveCurrentTemplate={openSaveTemplate}
        onManageTemplates={() => setTemplateLibraryOpen(true)}
        onOpenPreviewSettings={openPageSettings}
        onManageAssets={openAssetLibrary}
        onOpenVersionHistory={() => openVersionHistory()}
        onExportMarkdown={exportMarkdown}
        onExportHtml={() => { void exportHtml() }}
        onBackupWorkspace={() => { void backupWorkspace() }}
        onRestoreBackup={(file) => { void restoreWorkspaceBackup(file) }}
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
          onOpenSettings={openPageSettings}
          onOpenHistory={openVersionHistory}
        />
        <EditorPanel
          ref={editorPanelRef}
          value={content}
          onChange={updateContent}
          tab={editorTab}
          onTabChange={setEditorTab}
          onSelectionChange={(selection) => {
            previewPanelRef.current?.resumeFollowing()
            setEditorSelection(selection)
            if (selection.text.trim()) setSelectedComponentText(selection.text)
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
          <p>保存当前文章结构，之后可从顶部“模板”菜单快速新建文章。</p>
          <label><span>模板名称</span><Input aria-label="模板名称" value={templateName} onChange={(event) => setTemplateName(event.target.value)} /></label>
          <div><Button onClick={() => setSaveTemplateOpen(false)}>取消</Button><Button variant="primary" disabled={!templateName.trim()} onClick={saveCurrentTemplate}>保存模板</Button></div>
        </div>
      </Dialog>
      <TemplateLibraryDialog
        open={templateLibraryOpen}
        onOpenChange={setTemplateLibraryOpen}
        templates={templates}
        onUse={(templateId) => requestWorkspaceAction({ type: 'template', templateId })}
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
      <VersionHistoryDialog
        open={versionHistoryOpen}
        onOpenChange={setVersionHistoryOpen}
        versions={articleVersions}
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
      <Dialog open={publicationIssues.length > 0} onOpenChange={(open) => { if (!open) setPublicationIssues([]) }} title="发布前检查">
        <div className={styles.draftDialogBody}>
          <p>复制前发现以下问题，建议处理后再粘贴到公众号：</p>
          <ul>{publicationIssues.map((issue) => <li key={issue.code}>{issue.message}</li>)}</ul>
          <div>
            <Button onClick={() => setPublicationIssues([])}>返回检查</Button>
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
