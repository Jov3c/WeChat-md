export type ArticleTemplateLayout = 'standard' | 'tutorial' | 'news' | 'information' | 'share' | 'product'

export interface ArticleTemplate {
  id: string
  name: string
  description: string
  content: string
  layout?: ArticleTemplateLayout
  builtIn: boolean
}

export const builtInTemplates: ArticleTemplate[] = [
  { id: 'blank', name: '通用排版', description: '简洁、均衡的通用文章结构', content: '', layout: 'standard', builtIn: true },
  { id: 'tutorial', name: '教程文章', description: '突出步骤、说明和操作提示', content: '', layout: 'tutorial', builtIn: true },
  { id: 'news', name: '新闻报道', description: '突出标题、导语和信息层级', content: '', layout: 'news', builtIn: true },
  { id: 'information', name: '资讯文章', description: '适合资讯整理、分析和总结', content: '', layout: 'information', builtIn: true },
  { id: 'share', name: '经验分享', description: '适合故事、心得和观点表达', content: '', layout: 'share', builtIn: true },
  { id: 'product', name: '产品介绍', description: '突出卖点、功能和行动引导', content: '', layout: 'product', builtIn: true },
]

export function createCustomTemplate(
  id: string,
  name: string,
  content: string,
  layout: ArticleTemplateLayout = 'standard',
): ArticleTemplate {
  return { id, name, description: '自定义文章排版', content, layout, builtIn: false }
}
