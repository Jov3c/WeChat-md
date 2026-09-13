import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ArticleVersion } from '../../features/versions/articleVersions'
import { VersionHistoryDialog } from './VersionHistoryDialog'

const versions: ArticleVersion[] = [
  { id: 'manual', articleId: 'a1', title: '终稿', content: '# 终稿', createdAt: '2026-09-12T08:30:00.000Z', reason: 'manual' },
  { id: 'automatic', articleId: 'a1', title: '初稿', content: '# 初稿', createdAt: '2026-09-12T08:20:00.000Z', reason: 'automatic' },
]

describe('VersionHistoryDialog', () => {
  it('shows version reasons and asks before restoring a version', async () => {
    const user = userEvent.setup()
    const onRestore = vi.fn()
    render(<VersionHistoryDialog open onOpenChange={vi.fn()} versions={versions} onSaveCurrent={vi.fn()} onRestore={onRestore} />)

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
    render(<VersionHistoryDialog open onOpenChange={vi.fn()} versions={[]} onSaveCurrent={onSaveCurrent} onRestore={vi.fn()} />)

    expect(screen.getByText('还没有历史版本')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '保存当前版本' }))
    expect(onSaveCurrent).toHaveBeenCalledOnce()
  })
})
