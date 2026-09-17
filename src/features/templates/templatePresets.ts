import type { ArticleLayoutId } from '../layouts/articleLayouts'

export interface ArticleContentTemplate {
  id: string
  name: string
  description: string
  content: string
  layoutId: ArticleLayoutId
  builtIn: boolean
}

export const builtInContentTemplates: ArticleContentTemplate[] = [
  {
    id: 'tutorial-guide',
    name: '教程指南',
    description: '从目标、准备到操作步骤的完整教程框架',
    layoutId: 'tutorial',
    builtIn: true,
    content: `# 教程标题

用一句话说明这篇教程能帮助读者解决什么问题。

## 开始之前

- 需要准备的工具或资料
- 适合阅读这篇教程的人
- 完成后可以得到的结果

## 操作步骤

### 第一步：完成基础设置

说明操作方法，并补充必要的注意事项。

### 第二步：完成核心操作

继续说明关键步骤，可插入图片帮助读者理解。

## 常见问题

整理读者最容易遇到的问题和解决办法。

## 总结

回顾关键步骤，并给出下一步建议。`,
  },
  {
    id: 'news-report',
    name: '新闻报道',
    description: '适合发布事件动态、行业新闻和现场报道',
    layoutId: 'news',
    builtIn: true,
    content: `# 新闻标题

> 导语：用简短的一段话交代最重要的事实。

## 事件概况

说明时间、地点、人物和事件背景。

## 核心进展

按重要程度梳理已经确认的信息。

## 各方回应

补充相关人物、机构或行业的观点。

## 后续关注

说明事件可能带来的影响和接下来值得关注的节点。`,
  },
  {
    id: 'information-digest',
    name: '资讯速览',
    description: '适合汇总多条资讯并给出清晰的重点摘要',
    layoutId: 'information',
    builtIn: true,
    content: `# 本期资讯速览

用两三句话概括本期最值得关注的变化。

## 今日重点

列出最重要的一条资讯，并说明它为什么值得关注。

## 资讯一

补充事实、数据和必要背景。

## 资讯二

继续整理相关动态，保持段落简洁。

## 编辑观察

总结这些资讯之间的联系，并给出判断或建议。`,
  },
  {
    id: 'experience-share',
    name: '经验分享',
    description: '适合复盘实践过程、心得和可复用的方法',
    layoutId: 'share',
    builtIn: true,
    content: `# 我是如何解决这个问题的

先讲结果，再说明这段经历为什么值得分享。

## 问题背景

交代当时的目标、限制和遇到的困难。

## 尝试过的方法

分享有效和无效的尝试，以及判断依据。

## 最终方案

完整说明做法，并提炼可以复用的步骤。

## 我的收获

总结关键经验，以及如果重来一次会做出的调整。`,
  },
  {
    id: 'product-introduction',
    name: '产品介绍',
    description: '适合介绍产品价值、功能亮点和使用方式',
    layoutId: 'product',
    builtIn: true,
    content: `# 产品名称：一句话说清核心价值

用一个真实场景引出用户正在面对的问题。

## 为什么需要它

说明现有方式的不足，以及产品希望解决的核心问题。

## 核心功能

### 功能一

说明功能、使用方式和带来的价值。

### 功能二

继续介绍另一个重要能力。

## 适合谁使用

列出典型用户和使用场景。

## 开始使用

给出清晰的下一步操作指引。`,
  },
]

export function createCustomContentTemplate(
  id: string,
  name: string,
  content: string,
  layoutId: ArticleLayoutId = 'standard',
): ArticleContentTemplate {
  return { id, name, description: '自定义内容模板', content, layoutId, builtIn: false }
}

/** @deprecated 使用 ArticleContentTemplate。 */
export type ArticleTemplate = ArticleContentTemplate
/** @deprecated 使用 builtInContentTemplates。 */
export const builtInTemplates = builtInContentTemplates
/** @deprecated 使用 createCustomContentTemplate。 */
export const createCustomTemplate = createCustomContentTemplate
