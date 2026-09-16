import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConsoleRoot } from './ConsoleRoot'
import type { AdminRole } from '../../lib/admin'
import type { AdminHealthSnapshot } from '../../lib/adminHealth'

let authState: {
  cloud: boolean
  loading: boolean
  session: { user: { id: string; email?: string | null } } | null
} = {
  cloud: true,
  loading: false,
  session: { user: { id: 'owner-1', email: 'owner@example.com' } },
}

let adminRole: AdminRole | null = 'owner'

const healthSnapshot: AdminHealthSnapshot = {
  checkedAt: '2026-06-11T10:00:00.000Z',
  summaryStatus: 'ok',
  cards: [],
  metrics: [],
  jobs: [
    {
      id: 'job-1',
      source: 'admin_job_runs',
      jobType: 'health_check',
      status: 'succeeded',
      targetType: 'system',
      targetValue: null,
      targetCount: 0,
      resultSummary: { cards: 8 },
      errorMessage: null,
      createdAt: '2026-06-11T09:50:00.000Z',
      startedAt: null,
      finishedAt: '2026-06-11T09:50:01.000Z',
    },
  ],
  recentErrors: [],
}

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

vi.mock('../../lib/adminHealth', async () => {
  const actual = await vi.importActual<typeof import('../../lib/adminHealth')>('../../lib/adminHealth')
  return {
    ...actual,
    getAdminHealthSnapshot: vi.fn(async () => healthSnapshot),
  }
})

beforeEach(() => {
  authState = {
    cloud: true,
    loading: false,
    session: { user: { id: 'owner-1', email: 'owner@example.com' } },
  }
  adminRole = 'owner'
})

let roots: Root[] = []

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
})

async function renderConsoleRoot(path: string) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/console/*" element={<ConsoleRoot />} />
        </Routes>
      </MemoryRouter>,
    )
  })
  return container
}

async function waitForText(container: HTMLElement, text: string) {
  for (let i = 0; i < 30; i += 1) {
    if (container.textContent?.includes(text)) return
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
  throw new Error(`Missing text: ${text}`)
}

describe('ConsoleRoot', () => {
  it('keeps nested console module routes working behind the admin gate', async () => {
    const container = await renderConsoleRoot('/console/jobs')

    await waitForText(container, 'health_check')

    expect(container.textContent).toContain('Lịch chạy')
    expect(container.textContent).toContain('health_check')
    expect(container.textContent).toContain('Retry/cancel đang khóa')
  })
})
