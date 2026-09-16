import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Route, MemoryRouter, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConsoleAccessGate } from './ConsoleGate'
import type { AdminRole } from '../../lib/admin'

let authState: {
  cloud: boolean
  loading: boolean
  session: { user: { id: string; email?: string | null } } | null
} = {
  cloud: true,
  loading: false,
  session: { user: { id: 'user-1', email: 'owner@example.com' } },
}

let adminRole: AdminRole | null = 'owner'

vi.mock('../../lib/auth', () => ({
  useAuth: () => authState,
}))

vi.mock('../../lib/admin', async () => {
  const actual = await vi.importActual<typeof import('../../lib/admin')>('../../lib/admin')
  return {
    ...actual,
    getMyAdminRole: vi.fn(async () => adminRole),
  }
})

beforeEach(() => {
  authState = {
    cloud: true,
    loading: false,
    session: { user: { id: 'user-1', email: 'owner@example.com' } },
  }
  adminRole = 'owner'
})

let roots: Root[] = []

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
})

async function renderConsoleGate() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/console']}>
        <Routes>
          <Route path="/" element={<div data-testid="home">home</div>} />
          <Route
            path="/console/*"
            element={
              <ConsoleAccessGate>
                <div data-testid="console">console</div>
              </ConsoleAccessGate>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
  })
  return container
}

async function findTestId(container: HTMLElement, id: string): Promise<Element> {
  for (let i = 0; i < 20; i += 1) {
    const el = container.querySelector(`[data-testid="${id}"]`)
    if (el) return el
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
  throw new Error(`Missing test id: ${id}`)
}

describe('ConsoleAccessGate', () => {
  it('renders the console shell only for an active admin', async () => {
    const container = await renderConsoleGate()

    expect(await findTestId(container, 'console')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="home"]')).toBeNull()
  })

  it('redirects normal users back home without exposing console content', async () => {
    adminRole = null

    const container = await renderConsoleGate()

    expect(await findTestId(container, 'home')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="console"]')).toBeNull()
  })

  it('keeps the permission loading state neutral', async () => {
    authState = { ...authState, loading: true }

    const container = await renderConsoleGate()

    expect(container.textContent).toContain('Đang mở Splitz')
    expect(container.textContent?.toLowerCase()).not.toContain('console')
    expect(container.textContent?.toLowerCase()).not.toContain('admin')
  })
})
