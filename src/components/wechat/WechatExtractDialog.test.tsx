import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ExtractedWechatArticle } from '../../features/wechat/wechatExtraction'
import { WechatExtractDialog } from './WechatExtractDialog'

const result: ExtractedWechatArticle = {
  sourceUrl: 'https://mp.weixin.qq.com/s/example',
  title: '测试文章',
  author: '测试作者',
  html: '<h2>小节</h2><p>正文内容</p>',
  markdown: '## 小节\n\n正文内容',
  tokens: [
    { path: 'global.accentColor', label: '强调色', value: '#C04A36', displayValue: '#C04A36', swatch: '#C04A36' },
    { path: 'global.fontSize', label: '正文字号', value: 17, displayValue: '17 px' },
  ],
  components: [{ kind: 'heading', label: '章节标题', count: 1 }],
}

describe('WechatExtractDialog', () => {
  it('完成提取后先询问是否保存正文，再展示可选择的样式结果', async () => {
    const user = userEvent.setup()
    const onSaveArticle = vi.fn()
    render(
      <WechatExtractDialog
        open
        onOpenChange={() => undefined}
        extractor={async () => result}
        savePolicy="ask"
        onApply={() => undefined}
        onSaveStyle={() => undefined}
        onSaveArticle={onSaveArticle}
        onSavePolicyChange={() => undefined}
      />,
    )

    await user.type(screen.getByLabelText('公众号文章链接'), result.sourceUrl)
    await user.click(screen.getByRole('button', { name: '开始提取' }))

    expect(await screen.findByText('要保存这篇文章吗？')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '不保存' }))
    expect(await screen.findByText('测试文章')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '应用 强调色' })).toBeChecked()
    expect(screen.getByText('章节标题 · 1 处')).toBeInTheDocument()
    expect(onSaveArticle).not.toHaveBeenCalled()
  })

  it('应用时只提交当前勾选的样式项', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(
      <WechatExtractDialog
        open
        onOpenChange={() => undefined}
        extractor={async () => result}
        savePolicy="never"
        onApply={onApply}
        onSaveStyle={() => undefined}
        onSaveArticle={() => undefined}
        onSavePolicyChange={() => undefined}
      />,
    )

    await user.type(screen.getByLabelText('公众号文章链接'), result.sourceUrl)
    await user.click(screen.getByRole('button', { name: '开始提取' }))
    await screen.findByText('测试文章')
    await user.click(screen.getByRole('checkbox', { name: '应用 正文字号' }))
    await user.click(screen.getByRole('button', { name: '应用所选样式' }))

    expect(onApply).toHaveBeenCalledWith(result, ['global.accentColor'])
  })

  it('自动保存策略会保存正文并直接进入提取结果', async () => {
    const user = userEvent.setup()
    const onSaveArticle = vi.fn()
    render(
      <WechatExtractDialog
        open
        onOpenChange={() => undefined}
        extractor={async () => result}
        savePolicy="always"
        onApply={() => undefined}
        onSaveStyle={() => undefined}
        onSaveArticle={onSaveArticle}
        onSavePolicyChange={() => undefined}
      />,
    )

    await user.type(screen.getByLabelText('公众号文章链接'), result.sourceUrl)
    await user.click(screen.getByRole('button', { name: '开始提取' }))

    expect(await screen.findByText('测试文章')).toBeInTheDocument()
    expect(onSaveArticle).toHaveBeenCalledWith(result)
  })
})
