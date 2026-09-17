import { render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RuntimeServices } from './contracts'
import { PlatformGate } from './PlatformGate'

const services: RuntimeServices = {
  kind: 'desktop', articleRepository: null, assetRepository: null, versionRepository: null,
  extractWechatArticle: async () => { throw new Error('not used') },
  files: {
    openText: async () => null, openBytes: async () => null,
    saveText: async () => 'cancelled', saveBytes: async () => 'cancelled',
  },
  databasePath: 'sqlite:wechat-md.db',
}

describe('PlatformGate', () => {
  it('renders the application only after platform services are ready', async () => {
    render(<PlatformGate createServices={async () => services}>{(value) => <p>ready:{value.kind}</p>}</PlatformGate>)
    expect(await screen.findByText('ready:desktop')).toBeInTheDocument()
  })

  it('initializes platform services only once under React strict mode', async () => {
    const createServices = vi.fn(async () => services)

    render(
      <StrictMode>
        <PlatformGate createServices={createServices}>{(value) => <p>ready:{value.kind}</p>}</PlatformGate>
      </StrictMode>,
    )

    expect(await screen.findByText('ready:desktop')).toBeInTheDocument()
    expect(createServices).toHaveBeenCalledTimes(1)
  })

  it('shows a blocking storage error and retries initialization', async () => {
    const createServices = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('locked'), { databasePath: 'sqlite:wechat-md.db', details: 'database is locked' }))
      .mockResolvedValueOnce(services)
    const user = userEvent.setup()
    render(<PlatformGate createServices={createServices}>{(value) => <p>ready:{value.kind}</p>}</PlatformGate>)

    expect(await screen.findByText('桌面数据无法打开')).toBeInTheDocument()
    expect(screen.getByText('locked')).toBeInTheDocument()
    expect(screen.getByText('sqlite:wechat-md.db')).toBeInTheDocument()
    expect(screen.getByText('database is locked')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '重试' }))

    expect(await screen.findByText('ready:desktop')).toBeInTheDocument()
    expect(createServices).toHaveBeenCalledTimes(2)
  })
})
