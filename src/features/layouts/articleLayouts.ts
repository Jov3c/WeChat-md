export type ArticleLayoutId = 'standard' | 'tutorial' | 'news' | 'information' | 'share' | 'product'

export interface ArticleLayout {
  id: ArticleLayoutId
  name: string
  description: string
  builtIn: true
}

export const builtInLayouts: ArticleLayout[] = [
  { id: 'standard', name: '通用排版', description: '简洁、均衡的通用文章结构', builtIn: true },
  { id: 'tutorial', name: '教程文章', description: '突出步骤、说明和操作提示', builtIn: true },
  { id: 'news', name: '新闻报道', description: '突出标题、导语和信息层级', builtIn: true },
  { id: 'information', name: '资讯文章', description: '适合资讯整理、分析和总结', builtIn: true },
  { id: 'share', name: '经验分享', description: '适合故事、心得和观点表达', builtIn: true },
  { id: 'product', name: '产品介绍', description: '突出卖点、功能和行动引导', builtIn: true },
]

export function isArticleLayoutId(value: unknown): value is ArticleLayoutId {
  return builtInLayouts.some(({ id }) => id === value)
}
