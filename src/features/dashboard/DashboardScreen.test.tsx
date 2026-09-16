import { act, type HTMLAttributes, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardScreen } from './DashboardScreen'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const navigate = vi.hoisted(() => vi.fn())
const openCreateGroup = vi.hoisted(() => vi.fn())
const reload = vi.hoisted(() => vi.fn(async () => undefined))
const storeState = vi.hoisted(() => ({
  groups: [],
  loading: false,
  error: 'Mất kết nối tới máy chủ.',
  mode: 'cloud' as const,
  reload,
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}))

vi.mock('../../lib/store', () => ({
  useStore: () => storeState,
}))

vi.mock('../../lib/profile', () => ({
  useProfile: () => ({
    profile: { name: 'Sơn', avatarUrl: null },
    hasName: true,
  }),
}))

vi.mock('../../lib/auth', () => ({
  useAuth: () => ({
    profile: null,
    session: null,
  }),
}))

vi.mock('../../app/AppShell', () => ({
  useShell: () => ({ openCreateGroup }),
}))

let roots: Root[] = []

describe('DashboardScreen', () => {
  beforeEach(() => {
    navigate.mockClear()
    openCreateGroup.mockClear()
    reload.mockClear()
    storeState.groups = []
    storeState.loading = false
    storeState.error = 'Mất kết nối tới máy chủ.'
    storeState.mode = 'cloud'
  })

  afterEach(() => {
    for (const root of roots) root.unmount()
    roots = []
    document.body.innerHTML = ''
  })

  async function renderDashboard() {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    roots.push(root)
    await act(async () => {
      root.render(<DashboardScreen />)
    })
  }

  it('shows a reload error state instead of the first-run welcome when groups fail to load', async () => {
    await renderDashboard()

    expect(document.body.textContent).toContain('Không tải được nhóm')
    expect(document.body.textContent).toContain('Mất kết nối tới máy chủ.')
    expect(document.body.textContent).not.toContain('Chào mừng đến Splitz')

    const retry = Array.from(document.body.querySelectorAll('button')).find((button) =>
      button.textContent?.match(/thử lại/i),
    )
    expect(retry).toBeTruthy()

    await act(async () => {
      retry?.click()
    })

    expect(reload).toHaveBeenCalledTimes(1)
  })
})
