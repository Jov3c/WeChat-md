import type { ArticleLayoutId } from '../layouts/articleLayouts'
import type { StylePreset } from './stylePresets'

export interface ArticleStyleProfile {
  id: string
  name: string
  description: string
  styleId: string
  layoutId: ArticleLayoutId
  builtIn: boolean
}

export const builtInArticleStyleProfiles: ArticleStyleProfile[] = [
  { id: 'default', name: '默认 · 简洁', description: '清爽、均衡的通用风格', styleId: 'default', layoutId: 'standard', builtIn: true },
  { id: 'tutorial', name: '教程 · 清晰', description: '突出步骤、说明和操作提示', styleId: 'default', layoutId: 'tutorial', builtIn: true },
  { id: 'news', name: '新闻 · 严谨', description: '强化标题、导语与信息层级', styleId: 'ink', layoutId: 'news', builtIn: true },
  { id: 'information', name: '资讯 · 清爽', description: '适合资讯整理、分析和总结', styleId: 'default', layoutId: 'information', builtIn: true },
  { id: 'warm', name: '暖色 · 阅读', description: '柔和纸感与温暖的分享节奏', styleId: 'warm', layoutId: 'share', builtIn: true },
  { id: 'product', name: '产品 · 醒目', description: '突出卖点、功能和行动引导', styleId: 'warm', layoutId: 'product', builtIn: true },
  { id: 'ink', name: '墨色 · 长文', description: '克制、适合深度阅读的黑白风格', styleId: 'ink', layoutId: 'standard', builtIn: true },
]

export function createArticleStyleProfiles(stylePresets: StylePreset[]): ArticleStyleProfile[] {
  const customProfiles = stylePresets
    .filter((preset) => !preset.builtIn)
    .map((preset): ArticleStyleProfile => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      styleId: preset.id,
      layoutId: preset.layoutId ?? 'standard',
      builtIn: false,
    }))
  return [...builtInArticleStyleProfiles, ...customProfiles]
}

export function findActiveArticleStyleProfile(
  profiles: ArticleStyleProfile[],
  styleId: string,
  layoutId: ArticleLayoutId,
) {
  return profiles.find((profile) => profile.styleId === styleId && profile.layoutId === layoutId)
}
