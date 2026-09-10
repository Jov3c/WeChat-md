export interface ArticleItem {
  id: string
  title: string
  date: string
  content: string
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
\`\`\``

export const articles: ArticleItem[] = [
  { id: 'ollama', title: '在本地运行大语言模型：Ollama 完全指南', date: '今天 15:42', content: ollamaMarkdown },
  { id: 'ai-tools', title: 'AI 工具推荐清单', date: '2024-01-15', content: '# AI 工具推荐清单\n\n整理我日常使用的效率工具。' },
  { id: 'markdown', title: '如何高效使用 Markdown', date: '2024-01-12', content: '# 如何高效使用 Markdown\n\n从结构开始，而不是从样式开始。' },
  { id: 'knowledge', title: '从 0 开始搭建个人知识库', date: '2024-01-10', content: '# 从 0 开始搭建个人知识库' },
  { id: 'chatgpt', title: 'ChatGPT 使用心得', date: '2024-01-08', content: '# ChatGPT 使用心得' },
  { id: 'annual', title: '我的年度总结', date: '2024-01-05', content: '# 我的年度总结' },
  { id: 'efficiency', title: '好用的效率工具', date: '2024-01-03', content: '# 好用的效率工具' },
  { id: 'layout', title: '微信公众号排版技巧', date: '2024-01-01', content: '# 微信公众号排版技巧' },
]
