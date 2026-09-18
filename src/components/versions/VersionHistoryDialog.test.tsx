import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ArticleVersion } from '../../features/versions/articleVersions'
import { builtInStylePresets } from '../../features/styles/stylePresets'
import { VersionHistoryDialog } from './VersionHistoryDialog'

const versions: ArticleVersion[] = [
  { id: 'manual', articleId: 'a1', title: '终稿', content: '# 标题\n旧内容', styleId: 'default', createdAt: '2026-09-12T08:30:00.000Z', reason: 'manual' },
  { id: 'automatic', articleId: 'a1', title: '初稿', content: '# 初稿', createdAt: '2026-09-12T08:20:00.000Z', reason: 'automatic' },
]

const currentArticle = { title: '当前标题', content: '# 标题\n新内容', styleId: 'warm' }

describe('VersionHistoryDialog', () => {
  it('shows version reasons and asks before restoring a version', async () => {
    const user = userEvent.setup()
    const onRestore = vi.fn()
    render(<VersionHistoryDialog open onOpenChange={vi.fn()} versions={versions} currentArticle={currentArticle} onSaveCurrent={vi.fn()} onRestore={onRestore} />)

    expect(screen.getByText(/手动保存/)).toBeVisible()
    expect(screen.getAllByText(/自动留档/)).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: '恢复版本 终稿' }))
    expect(screen.getByText(/恢复前会先保存当前内容/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: '确认恢复' }))

    expect(onRestore).toHaveBeenCalledWith('manual')
  })

  it('can manually save the current state and explains an empty history', async () => {
    const user = userEvent.setup()
    const onSaveCurrent = vi.fn()
    render(<VersionHistoryDialog open onOpenChange={vi.fn()} versions={[]} currentArticle={currentArticle} onSaveCurrent={onSaveCurrent} onRestore={vi.fn()} />)

    expect(screen.getByText('还没有历史版本')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '保存当前版本' }))
    expect(onSaveCurrent).toHaveBeenCalledOnce()
  })

  it('shows title, style and line changes against the current article', async () => {
    const user = userEvent.setup()
    render(<VersionHistoryDialog open onOpenChange={vi.fn()} versions={versions} currentArticle={currentArticle} onSaveCurrent={vi.fn()} onRestore={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '查看版本变化 终稿' }))

    expect(screen.getByRole('heading', { name: '版本差异' })).toBeVisible()
    expect(screen.getByText('标题已变化')).toBeVisible()
    expect(screen.getByText('排版风格已变化')).toBeVisible()
    expect(screen.getByText('旧内容')).toBeVisible()
    expect(screen.getByText('新内容')).toBeVisible()
    expect(screen.getByText('旧内容').closest('[data-kind]')).toHaveAttribute('data-kind', 'removed')
    expect(screen.getByText('新内容').closest('[data-kind]')).toHaveAttribute('data-kind', 'added')

    await user.click(screen.getByRole('button', { name: '返回版本列表' }))
    expect(screen.getByRole('button', { name: '查看版本变化 终稿' })).toBeVisible()
  })

  it('explains when a version has no body changes', async () => {
    const user = userEvent.setup()
    const matching = { ...versions[0], title: currentArticle.title, content: currentArticle.content, styleId: currentArticle.styleId }
    render(<VersionHistoryDialog open onOpenChange={vi.fn()} versions={[matching]} currentArticle={currentArticle} onSaveCurrent={vi.fn()} onRestore={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '查看版本变化 当前标题' }))

    expect(screen.getByText('没有正文变化')).toBeVisible()
  })

  it('detects style edits even when the preset id stays the same', async () => {
    const user = userEvent.setup()
    const historicalStyle = builtInStylePresets[0]
    const currentStyle = { ...historicalStyle, global: { ...historicalStyle.global, fontSize: historicalStyle.global.fontSize + 1 } }
    const historical = { ...versions[0], title: currentArticle.title, content: currentArticle.content, styleId: historicalStyle.id, styleSnapshot: historicalStyle }
    render(<VersionHistoryDialog
      open
      onOpenChange={vi.fn()}
      versions={[historical]}
      currentArticle={{ ...currentArticle, styleId: historicalStyle.id, styleSnapshot: currentStyle }}
      onSaveCurrent={vi.fn()}
      onRestore={vi.fn()}
    />)

    await user.click(screen.getByRole('button', { name: '查看版本变化 当前标题' }))

    expect(screen.getByText('排版风格已变化')).toBeVisible()
  })

  it('keeps the restore confirmation when restoring from the diff view', async () => {
    const user = userEvent.setup()
    const onRestore = vi.fn()
    render(<VersionHistoryDialog open onOpenChange={vi.fn()} versions={versions} currentArticle={currentArticle} onSaveCurrent={vi.fn()} onRestore={onRestore} />)

    await user.click(screen.getByRole('button', { name: '查看版本变化 终稿' }))
    await user.click(screen.getByRole('button', { name: '恢复这个版本' }))

    expect(screen.getByRole('dialog', { name: '恢复这个版本？' })).toBeVisible()
    expect(onRestore).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '确认恢复' }))
    expect(onRestore).toHaveBeenCalledWith('manual')
  })
})
