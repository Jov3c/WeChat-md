export interface ContentComponent {
  id: string
  name: string
  description: string
  content: string
  builtIn: boolean
}

export const builtInContentComponents: ContentComponent[] = [
  { id: 'info', name: '信息卡片', description: '补充背景或说明', content: '> 💡 **信息**\n>\n> 在这里补充背景信息。', builtIn: true },
  { id: 'highlight', name: '重点提示', description: '强调读者需要关注的内容', content: '> ⚠️ **重点提示**\n>\n> 在这里写下需要特别注意的内容。', builtIn: true },
  { id: 'steps', name: '步骤列表', description: '整理清晰的操作步骤', content: '1. 第一步\n2. 第二步\n3. 第三步', builtIn: true },
  { id: 'section', name: '分节标题', description: '开始一个新的内容章节', content: '## 新章节\n\n在这里开始新的内容。', builtIn: true },
  { id: 'image', name: '图片说明', description: '插入带说明的图片占位', content: '![图片说明](图片地址)\n\n*图片说明文字*', builtIn: true },
  { id: 'code', name: '代码示例', description: '插入带语言标记的代码块', content: '```text\n在这里粘贴代码\n```', builtIn: true },
  { id: 'signature', name: '作者署名', description: '用于文章结尾的固定署名', content: '---\n\n**作者：你的名字**\n\n感谢阅读。', builtIn: true },
  { id: 'follow', name: '关注引导', description: '用于文末的关注提示', content: '> 如果这篇文章对你有帮助，欢迎关注并分享。', builtIn: true },
]

export function createCustomContentComponent(id: string, name: string, content: string): ContentComponent {
  return { id, name, description: '自定义内容块', content, builtIn: false }
}
