export interface ArticleItem {
  id: string
  title: string
  date: string
  content: string
  styleId?: string
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

export const ollamaMarkdown = `# 在本地运行大语言模型：Ollama 完全指南

Ollama 是一个简单易用的工具，让你可以在本地运行各种开源大语言模型。本文将从安装、使用到常见问题，带你快速上手。

## 1. 什么是 Ollama？

Ollama 是一个开源的本地大模型运行工具，支持 Llama、Mistral、Gemma 等多种模型。它的特点是：

- 安装简单
- 使用方便
- 支持多种模型
- 运行在本地，保护隐私

## 2. 安装 Ollama

### 2.1 下载安装

访问 [Ollama 官网](https://ollama.com) 下载适合你系统的版本。

\`\`\`bash
# macOS
brew install ollama

# Windows
# 下载安装包并按照提示安装
\`\`\`

### 2.2 启动服务

安装完成后打开终端，运行下面的命令启动 Ollama：

\`\`\`bash
ollama serve
\`\`\`

如果应用已经在后台运行，这一步会提示端口正在使用，可以直接进入下一节。

> 提示：首次使用前先确认磁盘空间。模型文件通常较大，下载前预留足够空间可以避免中途失败。

## 3. 下载并运行第一个模型

### 3.1 选择模型

不同模型对内存和显存的要求不同。第一次体验时，可以从体积较小的模型开始，再根据速度和效果调整。

| 使用场景 | 选择建议 | 关注重点 |
| --- | --- | --- |
| 日常问答 | 小型通用模型 | 响应速度 |
| 中文写作 | 中文能力较好的模型 | 表达质量 |
| 编程辅助 | 代码专用模型 | 语言覆盖 |
| 长文分析 | 支持长上下文的模型 | 内存占用 |

### 3.2 运行模型

\`\`\`bash
ollama run 模型名称
\`\`\`

命令执行后会自动下载模型。下载完成即可在终端中输入问题，使用 \`/bye\` 退出当前对话。

## 4. 实用操作

### 4.1 查看本地模型

\`\`\`bash
ollama list
\`\`\`

### 4.2 删除不再使用的模型

\`\`\`bash
ollama rm 模型名称
\`\`\`

### 4.3 让其他工具连接 Ollama

Ollama 启动后会提供本地接口。支持 Ollama 的写作工具、聊天界面和开发工具通常只需要填写本地服务地址即可连接。

1. 保持 Ollama 在后台运行
2. 在目标工具中选择 Ollama
3. 填写本地服务地址
4. 选择已经下载的模型
5. 发送一条测试消息

## 5. 常见问题

### 下载速度慢怎么办？

先确认网络连接稳定，并避免同时下载多个大型模型。如果下载中断，重新执行运行命令通常会继续处理。

### 模型运行后响应很慢怎么办？

优先尝试参数规模更小的模型，同时关闭占用大量内存或显存的程序。模型越大，对硬件资源的要求通常越高。

### 如何确认服务是否正常？

先运行 \`ollama list\` 检查命令是否可用，再启动一个已下载的模型进行简单对话。如果命令正常但第三方工具无法连接，应检查工具填写的服务地址。

## 6. 下一步

完成第一次本地对话后，可以按照自己的任务继续探索：写作用户可以建立固定提示词，开发者可以连接编辑器，知识管理用户可以尝试本地文档问答。

本地模型并不一定替代所有在线服务，但它提供了一个可控、可离线、便于实验的选择。先从一个明确的小任务开始，再逐步扩大使用范围。`

export const articles: ArticleItem[] = [
  { id: 'ollama', title: '在本地运行大语言模型：Ollama 完全指南', date: '今天 15:42', content: ollamaMarkdown, templateId: 'tutorial' },
]
