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
  {
    id: 'information-to-action', name: '信息到行动', description: '适合方法论、研究报告和深度长文', builtIn: true,
    content: `# 把一条信息变成行动

> 用一句话说明这篇文章要解决的问题，以及读者能获得什么。

## 目录

1. 看见信息
2. 理解信息
3. 做出选择
4. 开始行动

## 一、看见真正重要的信息

写下背景、事实和观察，删除与结论无关的材料。

### 核心判断

- 事实是什么
- 变化是什么
- 为什么值得关注

## 二、把信息转化为理解

用案例、数据或引用解释你的判断。

| 阶段 | 关键问题 | 输出 |
| --- | --- | --- |
| 收集 | 发生了什么 | 事实清单 |
| 判断 | 为什么重要 | 核心观点 |
| 行动 | 下一步做什么 | 行动方案 |

## 三、形成可执行的下一步

\`\`\`text
目标：
行动：
期限：
验证方式：
\`\`\`

## 写在最后

用一段简洁的总结收束全文，并给读者一个明确的下一步。`,
  },
]

export function createCustomTemplate(id: string, name: string, content: string): ArticleTemplate {
  return { id, name, description: '自定义文章结构', content, builtIn: false }
}
