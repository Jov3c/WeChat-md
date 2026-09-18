export interface ArticleItem {
  id: string
  title: string
  date: string
  content: string
  styleId?: string
  layoutId?: import('../features/layouts/articleLayouts').ArticleLayoutId
  contentTemplateId?: string
  /** @deprecated 旧工作区兼容字段。 */
  templateId?: string
  favorite?: boolean
  source?: 'local' | 'imported' | 'wechat'
  status?: 'draft' | 'published' | 'trash'
  titleMode?: 'auto' | 'manual'
  author?: string
  sourceUrl?: string
  importedAt?: string
  originalHtml?: string
}

export const wechatMdGuideMarkdown = `# 一篇示例，完整看懂 WeChat MD

这不是一篇普通的占位文章，而是一份可以边读、边操作的 **WeChat MD 全功能示例**。你会依次用到 Markdown 写作、实时预览、模板与风格、双向定位、公众号提取、图片管理和发布检查。

正文已经准备了标题、列表、引用、链接、表格和代码块。你可以随意修改左侧原稿，再观察中间预览如何即时变化。

## 先从一篇文章开始

### 在编辑区写 Markdown

中间左栏是 Markdown 编辑器，右栏是公众号效果预览。写作时不需要反复打开其他页面，标题层级、段落间距和强调样式都会立即呈现。

下面这段就是最常用的文章骨架：

\`\`\`markdown
# 文章标题

用一小段话告诉读者，这篇文章能解决什么问题。

## 第一部分

- 一个清晰的观点
- 一个可以执行的步骤
\`\`\`

### 用结构代替手工排版

- 一级标题负责整篇文章的主题
- 二级标题划分主要章节
- 三级标题承载具体问题
  - 一段只讲一个重点
  - 关键词可以适度 **加粗**
- 列表适合步骤、清单和并列信息

> 好排版不是给内容增加装饰，而是让读者更快看懂结构，并在重要信息前自然停下来。

### 双向点击定位

文章较长时，可以点击预览中的任意段落，编辑器会定位到对应原文；在编辑器中选择或点击内容，预览也会找到对应位置并高亮。这个能力与双栏同步滚动相互独立，即使关闭同步滚动，点击定位仍然可用。

## 让模板与风格各司其职

### 版式决定文章怎么排

顶部的“版式”用于切换文章类型，例如教程、新闻、资讯、经验分享和产品介绍。它改变标题、章节、引用与列表的视觉组织方式，**不会替换正文，也不会新建文章**。

1. 打开顶部“版式”菜单
2. 选择适合当前内容的文章版式
3. 在预览区检查章节节奏
4. 不满意时继续切换，正文始终保留

### 风格决定文章看起来怎样

“风格”主要控制颜色、字体、字号、行距和局部视觉。WeChat MD 保留三套清晰、稳定的基础风格：

- **默认 · 简洁**：适合教程、资讯和日常更新
- **暖色 · 阅读**：适合故事、随笔和生活内容
- **墨色 · 长文**：适合深度文章与沉浸阅读

版式负责文章类型的排版规则，风格负责颜色和字体。内容模板则提供可以直接开始填写的正文骨架，使用后会新建文章，不会覆盖当前原稿。

## 提取公众号文章与管理图片

### 从文章链接开始

点击“提取公众号”，粘贴一篇微信公众号文章链接。提取完成后可以预览正文、识别排版信息，再决定保存文章或应用其中的样式。

保存文章时，远程图片会下载到本地资源库；桌面端还可以在“软件设置”中选择图片文件的保存位置。这样即使原始链接变化，文章中的图片也能继续使用。

### 三种添加图片的方式

1. 点击编辑器上方的“插入图片”上传本地文件
2. 将图片直接拖入或粘贴到编辑器
3. 在图片资源库中粘贴网络图片链接并下载

图片从正文移除后会进入“未使用”状态，不会立刻删除原文件，避免误操作造成素材丢失。

## 把常用内容保存下来

### 保存自己的风格

在右侧排版设置中调整字号、行距、标题、引用、代码块或表格后，可以保存为自定义风格。以后写新文章时直接应用，无需重复设置。

### 保存文章模板与组件

如果当前排版很适合某类文章，可以保存为自定义模板；固定结尾、作者介绍、关注提示等可重复片段，则适合保存为组件。组件插入正文后仍然是普通 Markdown，可以继续编辑。

| 功能 | 解决的问题 |
| --- | --- |
| 版式 | 切换教程、新闻或分享文章的排版规则 |
| 模板 | 用预先准备的正文骨架新建文章 |
| 风格 | 统一颜色、字体、字号与阅读节奏 |
| 组件 | 复用固定结尾、提示框和常用内容块 |
| 图片资源 | 集中管理上传和提取到的图片 |
| 历史版本 | 找回重要节点，降低误改风险 |

## 发布前检查

### 先看内容，再看样式

- 标题层级是否连续，章节名称是否准确
- 每段是否只表达一个核心意思
- 引用、列表、表格和代码块是否完整
- 图片是否正常显示，图片前后是否有说明
- 桌面预览和手机预览是否都能读完全文
- 重点是否足够突出，又没有大面积加粗

### 复制到公众号

确认无误后，点击右上角“复制到公众号”，再粘贴到微信公众号编辑器中。若要保留原稿，也可以通过“更多操作”导出 Markdown 或创建工作区备份。

---

现在试着改动这篇文章、切换一次版式，再选择不同风格。你会发现：从写作、排版到发布，所有步骤都可以留在同一个工作区里完成。`

export const articles: ArticleItem[] = [
  { id: 'wechat-md-guide-v2', title: '一篇示例，完整看懂 WeChat MD', date: '刚刚', content: wechatMdGuideMarkdown, layoutId: 'tutorial' },
]

const legacyBundledArticles = new Map([
  ['wechat-md-guide', '一篇示例，完整看懂 WeChat MD'],
  ['ollama', '在本地运行大语言模型：Ollama 完全指南'],
  ['ai-tools', 'AI 工具推荐清单'],
  ['markdown', '如何高效使用 Markdown'],
  ['knowledge', '从 0 开始搭建个人知识库'],
  ['chatgpt', 'ChatGPT 使用心得'],
  ['annual', '我的年度总结'],
  ['efficiency', '好用的效率工具'],
  ['layout', '微信公众号排版技巧'],
])

export function replaceLegacyDemoArticles(storedArticles: ArticleItem[]) {
  const hasLegacyBundledArticle = storedArticles.some((article) => (
    legacyBundledArticles.get(article.id) === article.title
  ))
  if (!hasLegacyBundledArticle) return storedArticles

  const retained = storedArticles.filter((article) => (
    article.id === articles[0].id
    || legacyBundledArticles.get(article.id) !== article.title
  ))
  const guide = retained.find((article) => article.id === articles[0].id) ?? { ...articles[0] }
  return [guide, ...retained.filter((article) => article.id !== guide.id)]
}
