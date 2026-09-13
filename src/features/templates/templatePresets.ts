export interface ArticleTemplate {
  id: string
  name: string
  description: string
  content: string
  builtIn: boolean
}

export const builtInTemplates: ArticleTemplate[] = [
  { id: 'blank', name: '空白文章', description: '从空白页面开始创作', content: '', builtIn: true },
  {
    id: 'tutorial', name: '教程文章', description: '适合指南、教程和经验分享', builtIn: true,
    content: '# 教程文章\n\n从一个清晰的标题开始，在这里写下你的开场。\n\n## 关键观点\n\n- 用简短段落表达一个观点\n- 用小标题组织阅读节奏\n- 完成后从右侧调整排版风格\n\n> 好的排版服务于内容，而不是抢走注意力。\n\n## 下一步\n\n删除示例内容，开始你的创作。',
  },
  {
    id: 'product', name: '产品介绍', description: '清晰介绍产品价值与使用方式', builtIn: true,
    content: '# 产品名称\n\n用一句话说明产品解决的问题。\n\n## 产品亮点\n\n- 亮点一\n- 亮点二\n- 亮点三\n\n## 使用方式\n\n说明如何开始使用。\n\n## 写在最后\n\n补充行动建议或联系方式。',
  },
  {
    id: 'news', name: '资讯文章', description: '适合事件解读与信息汇总', builtIn: true,
    content: '# 资讯标题\n\n简要说明事件背景与核心信息。\n\n## 发生了什么\n\n梳理事实与时间线。\n\n## 为什么值得关注\n\n解释影响与关键变化。\n\n## 总结\n\n给出结论或后续观察点。',
  },
]

export function createCustomTemplate(id: string, name: string, content: string): ArticleTemplate {
  return { id, name, description: '自定义文章结构', content, builtIn: false }
}
