import { useRef, useState } from 'react'
import type { WechatArticleSavePolicy } from '../../components/wechat/WechatExtractDialog'
import { localizeRemoteMarkdownImages } from '../../features/assets/assetMarkdown'
import type { StoredImageAsset } from '../../features/assets/assetRepository'
import { applyExtractedStyle, type ExtractedWechatArticle } from '../../features/wechat/wechatExtraction'
import { duplicateStylePreset, type StylePreset, type StyleValuePath } from '../../features/styles/stylePresets'
import type { DesktopImageArchive } from '../../platform/desktopImageArchive'
import type { ArticleItem } from '../demoData'

export interface UseWechatExtractionOptions {
  extractor: (url: string) => Promise<ExtractedWechatArticle>
  imageArchive?: DesktopImageArchive
  activeStyle: StylePreset
  styleDraft?: StylePreset | null
  selectedId: string
  createArticleId: () => string
  saveRemoteAsset: (url: string, source: 'remote' | 'wechat') => Promise<StoredImageAsset>
  onArticleSaved: (article: ArticleItem) => void
  onStyleDraftChange: (style: StylePreset | null) => void
  onStyleSaved: (style: StylePreset, articleId: string) => void
  onOpenLayoutSettings: () => void
  onNotify: (message: string) => void
}

export function useWechatExtraction({
  extractor,
  imageArchive,
  activeStyle,
  styleDraft,
  selectedId,
  createArticleId,
  saveRemoteAsset,
  onArticleSaved,
  onStyleDraftChange,
  onStyleSaved,
  onOpenLayoutSettings,
  onNotify,
}: UseWechatExtractionOptions) {
  const [wechatExtractOpen, setWechatExtractOpen] = useState(false)
  const [wechatSavePolicy, setWechatSavePolicy] = useState<WechatArticleSavePolicy>('ask')
  const styleSequenceRef = useRef(0)

  const saveWechatArticle = async (extraction: ExtractedWechatArticle) => {
    const downloadedAssets: StoredImageAsset[] = []
    const localized = await localizeRemoteMarkdownImages(extraction.markdown, async (url) => {
      const asset = await saveRemoteAsset(url, 'wechat')
      downloadedAssets.push(asset)
      return asset.id
    })
    let archived: { directory: string; saved: number } | undefined
    let archiveFailed = false
    if (imageArchive && downloadedAssets.length) {
      try {
        archived = await imageArchive.saveArticle(extraction.title, await Promise.all(downloadedAssets.map(async (asset) => ({
          name: asset.name,
          mimeType: asset.mimeType,
          bytes: new Uint8Array(await asset.blob.arrayBuffer()),
        }))))
      } catch {
        archiveFailed = true
      }
    }
    const markdown = /^#\s+/m.test(localized.markdown)
      ? localized.markdown
      : `# ${extraction.title}\n\n${localized.markdown}`.trim()
    onArticleSaved({
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
    })
    onNotify(archiveFailed
      ? '文章已保存，但图片写入磁盘失败，请检查软件设置中的保存位置'
      : archived
        ? `文章已保存，${archived.saved} 张图片已保存到 ${archived.directory}`
        : localized.failedUrls.length
          ? `文章已保存，${localized.failedUrls.length} 张图片下载失败并保留原链接`
          : `已保存公众号文章“${extraction.title}”`)
  }

  const applyWechatStyle = (extraction: ExtractedWechatArticle, selectedPaths: StyleValuePath[]) => {
    onStyleDraftChange(applyExtractedStyle(activeStyle, extraction, selectedPaths))
    onOpenLayoutSettings()
    onNotify(selectedPaths.length === extraction.tokens.length ? '已应用整套提取风格' : '已应用所选提取样式')
  }

  const mergeWechatStyle = (extraction: ExtractedWechatArticle, selectedPaths: StyleValuePath[]) => {
    onStyleDraftChange(applyExtractedStyle(styleDraft ?? activeStyle, extraction, selectedPaths))
    onOpenLayoutSettings()
    onNotify('已合并到当前风格，保存后长期使用')
  }

  const saveWechatStyle = (extraction: ExtractedWechatArticle, selectedPaths: StyleValuePath[], name: string) => {
    styleSequenceRef.current += 1
    const mapped = applyExtractedStyle(activeStyle, extraction, selectedPaths)
    const saved = duplicateStylePreset(mapped, `wechat-style-${Date.now()}-${styleSequenceRef.current}`, name)
    saved.description = `提取自“${extraction.title}”`
    onStyleSaved(saved, selectedId)
    onStyleDraftChange(null)
    onNotify(`已保存并应用“${name}”`)
  }

  return {
    extractor,
    wechatExtractOpen,
    setWechatExtractOpen,
    wechatSavePolicy,
    setWechatSavePolicy,
    saveWechatArticle,
    applyWechatStyle,
    mergeWechatStyle,
    saveWechatStyle,
  }
}
