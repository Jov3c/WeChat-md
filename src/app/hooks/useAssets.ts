import { useCallback, useEffect, useRef, useState } from 'react'
import {
  collectImageAssetIds,
  createImageMarkdown,
  removeImageAssetReference,
} from '../../features/assets/assetMarkdown'
import type { AssetRepository, ImageAsset } from '../../features/assets/assetRepository'
import { createStoredImageAsset, fetchImageAsset } from '../../features/assets/imageAssets'
import type { ArticleItem } from '../demoData'

export interface UseAssetsOptions {
  repository: AssetRepository | null
  articles: ArticleItem[]
  selectedId: string
  content: string
  imageFetcher?: typeof fetch
  onInsertText: (markdown: string) => void
  onContentChange: (content: string) => void
  onNotify: (message: string) => void
}

export function useAssets({
  repository,
  articles,
  selectedId,
  content,
  imageFetcher,
  onInsertText,
  onContentChange,
  onNotify,
}: UseAssetsOptions) {
  const [assetLibraryOpen, setAssetLibraryOpen] = useState(false)
  const [resourceAssets, setResourceAssets] = useState<ImageAsset[]>([])
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({})
  const [resourceAssetUrls, setResourceAssetUrls] = useState<Record<string, string>>({})
  const previewObjectUrlsRef = useRef<string[]>([])
  const resourceObjectUrlsRef = useRef<string[]>([])
  const articlesRef = useRef(articles)
  const selectedIdRef = useRef(selectedId)
  const contentRef = useRef(content)
  const onInsertTextRef = useRef(onInsertText)
  const onContentChangeRef = useRef(onContentChange)
  const onNotifyRef = useRef(onNotify)
  articlesRef.current = articles
  selectedIdRef.current = selectedId
  contentRef.current = content
  onInsertTextRef.current = onInsertText
  onContentChangeRef.current = onContentChange
  onNotifyRef.current = onNotify

  const revokeUrls = (urls: string[]) => {
    if (typeof URL.revokeObjectURL === 'function') urls.forEach((url) => URL.revokeObjectURL(url))
  }

  useEffect(() => () => {
    revokeUrls(previewObjectUrlsRef.current)
    revokeUrls(resourceObjectUrlsRef.current)
  }, [])

  useEffect(() => {
    let active = true
    const ids = collectImageAssetIds(content)
    if (!repository || ids.length === 0) {
      revokeUrls(previewObjectUrlsRef.current)
      previewObjectUrlsRef.current = []
      setAssetUrls({})
      return () => { active = false }
    }
    Promise.all(ids.map(async (id) => [id, await repository.get(id)] as const)).then((entries) => {
      if (!active) return
      revokeUrls(previewObjectUrlsRef.current)
      const objectUrls: string[] = []
      const urls: Record<string, string> = {}
      entries.forEach(([id, asset]) => {
        if (!asset || typeof URL.createObjectURL !== 'function') return
        const url = URL.createObjectURL(asset.blob)
        objectUrls.push(url)
        urls[id] = url
      })
      previewObjectUrlsRef.current = objectUrls
      setAssetUrls(urls)
    }).catch(() => { if (active) setAssetUrls({}) })
    return () => { active = false }
  }, [content, repository])

  const importImageFiles = useCallback(async (files: File[], source: 'file' | 'paste' | 'drop') => {
    if (!repository) {
      onNotifyRef.current('当前环境无法保存图片')
      return
    }
    try {
      const assets = files.map((file) => createStoredImageAsset(file, source))
      await Promise.all(assets.map((asset) => repository.save(asset)))
      setResourceAssets((current) => [...assets.map(({ blob: _blob, ...asset }) => asset), ...current])
      onInsertTextRef.current(assets.map((asset) => createImageMarkdown(asset.id, asset.name.replace(/\.[^.]+$/, ''))).join('\n\n'))
      onNotifyRef.current(assets.length > 1 ? `已插入 ${assets.length} 张图片` : '图片已插入')
    } catch (reason) {
      onNotifyRef.current(reason instanceof Error ? reason.message : '图片插入失败')
    }
  }, [repository])

  const refreshAssetLibrary = useCallback(async () => {
    if (!repository) return
    const globallyUsed = new Set(articlesRef.current.flatMap((article) => collectImageAssetIds(article.content)))
    const stored = await repository.list()
    await Promise.all(stored.map((asset) => repository.setUnused(asset.id, !globallyUsed.has(asset.id))))
    setResourceAssets(stored.map((asset) => ({ ...asset, unused: !globallyUsed.has(asset.id) })))
    if (typeof URL.createObjectURL !== 'function') return
    revokeUrls(resourceObjectUrlsRef.current)
    const entries = await Promise.all(stored.map(async (asset) => [asset.id, await repository.get(asset.id)] as const))
    const urls: Record<string, string> = {}
    resourceObjectUrlsRef.current = []
    entries.forEach(([id, asset]) => {
      if (!asset) return
      const url = URL.createObjectURL(asset.blob)
      urls[id] = url
      resourceObjectUrlsRef.current.push(url)
    })
    setResourceAssetUrls(urls)
  }, [repository])

  const openAssetLibrary = useCallback(() => {
    setAssetLibraryOpen(true)
    void refreshAssetLibrary()
  }, [refreshAssetLibrary])

  const insertStoredAsset = useCallback((id: string) => {
    const asset = resourceAssets.find((candidate) => candidate.id === id)
    if (!asset) return
    onInsertTextRef.current(createImageMarkdown(asset.id, asset.name.replace(/\.[^.]+$/, '')))
    void repository?.setUnused(id, false)
  }, [repository, resourceAssets])

  const saveRemoteAsset = useCallback(async (url: string, source: 'remote' | 'wechat') => {
    if (!repository) throw new Error('当前环境无法保存图片')
    const asset = await fetchImageAsset(url, source, {
      fetcher: imageFetcher ?? (async (target) => fetch(`/api/assets/fetch?url=${encodeURIComponent(String(target))}`)),
    })
    await repository.save(asset)
    return asset
  }, [imageFetcher, repository])

  const importNetworkImage = useCallback(async (url: string, source: 'remote' | 'wechat' = 'remote') => {
    if (!repository) return
    try {
      const asset = await saveRemoteAsset(url, source)
      const { blob: _blob, ...metadata } = asset
      setResourceAssets((current) => [metadata, ...current])
      onInsertTextRef.current(createImageMarkdown(asset.id, asset.name.replace(/\.[^.]+$/, '')))
      onNotifyRef.current('网络图片已保存并插入')
    } catch (reason) {
      onNotifyRef.current(reason instanceof Error ? reason.message : '网络图片下载失败')
    }
  }, [repository, saveRemoteAsset])

  const removeAssetFromCurrentArticle = useCallback((id: string) => {
    onContentChangeRef.current(removeImageAssetReference(contentRef.current, id))
    const usedElsewhere = articlesRef.current.some((article) => article.id !== selectedIdRef.current && collectImageAssetIds(article.content).includes(id))
    void repository?.setUnused(id, !usedElsewhere)
    setResourceAssets((current) => current.map((asset) => asset.id === id ? { ...asset, unused: !usedElsewhere } : asset))
  }, [repository])

  const deleteUnusedAsset = useCallback(async (id: string) => {
    await repository?.delete(id)
    setResourceAssets((current) => current.filter((asset) => asset.id !== id))
    onNotifyRef.current('未使用图片已永久删除')
  }, [repository])

  return {
    assetLibraryOpen,
    setAssetLibraryOpen,
    resourceAssets,
    assetUrls,
    resourceAssetUrls,
    importImageFiles,
    refreshAssetLibrary,
    openAssetLibrary,
    insertStoredAsset,
    saveRemoteAsset,
    importNetworkImage,
    removeAssetFromCurrentArticle,
    deleteUnusedAsset,
  }
}
