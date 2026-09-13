import { describe, expect, it } from 'vitest'
import { builtInStylePresets } from '../styles/stylePresets'
import {
  applyExtractedStyle,
  normalizeWechatArticleUrl,
  type ExtractedWechatArticle,
} from './wechatExtraction'

const extracted: ExtractedWechatArticle = {
  sourceUrl: 'https://mp.weixin.qq.com/s/example',
  title: '一篇测试文章',
  author: '测试作者',
  html: '<p>正文</p>',
  markdown: '# 一篇测试文章\n\n正文',
  tokens: [
    { path: 'global.accentColor', label: '强调色', value: '#336699', displayValue: '#336699' },
    { path: 'global.fontSize', label: '正文字号', value: 17, displayValue: '17 px' },
    { path: 'global.lineHeight', label: '正文行高', value: 1.8, displayValue: '1.8 ×' },
  ],
  components: [{ kind: 'heading', label: '章节标题', count: 2 }],
}

describe('normalizeWechatArticleUrl', () => {
  it('只接受微信公众号文章域名并移除片段', () => {
    expect(normalizeWechatArticleUrl(' https://mp.weixin.qq.com/s/example#part ')).toBe(
      'https://mp.weixin.qq.com/s/example',
    )
  })

  it('拒绝伪装成微信链接的其他域名', () => {
    expect(() => normalizeWechatArticleUrl('https://mp.weixin.qq.com.example.com/s/1')).toThrow(
      '目前仅支持微信公众号文章链接',
    )
  })
})

describe('applyExtractedStyle', () => {
  it('只应用用户选中的样式项且不改动基础风格', () => {
    const base = builtInStylePresets[0]
    const next = applyExtractedStyle(base, extracted, ['global.accentColor', 'global.fontSize'])

    expect(next.global.accentColor).toBe('#336699')
    expect(next.global.fontSize).toBe(17)
    expect(next.global.lineHeight).toBe(base.global.lineHeight)
    expect(base.global.accentColor).toBe('#141413')
  })
})
