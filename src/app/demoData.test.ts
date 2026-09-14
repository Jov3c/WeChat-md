import { articles } from './demoData'

describe('fresh workspace demo content', () => {
  it('starts with one tutorial-oriented long-form example', () => {
    expect(articles).toHaveLength(1)
    expect(articles[0]).toMatchObject({ id: 'ollama', templateId: 'tutorial' })
    expect(articles[0].content).toContain('## 2. 安装 Ollama')
    expect(articles[0].content).toContain('## 5. 常见问题')
    expect(articles[0].content.length).toBeGreaterThan(1_200)
  })
})
