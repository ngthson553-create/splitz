import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConsoleHealthPage } from './ConsolePages'
import type { AdminHealthSnapshot } from '../../lib/adminHealth'

const snapshot: AdminHealthSnapshot = {
  checkedAt: '2026-06-10T09:00:00.000Z',
  summaryStatus: 'failed',
  cards: [
    {
      id: 'supabase',
      label: 'Supabase/Auth',
      status: 'ok',
      detail: 'Auth JWT valid, DB reachable',
      lastSuccessAt: '2026-06-10T09:00:00.000Z',
      lastErrorAt: null,
      lastError: null,
    },
    {
      id: 'ai',
      label: 'AI provider',
      status: 'configured',
      detail: 'Provider key configured',
      lastSuccessAt: null,
      lastErrorAt: null,
      lastError: null,
    },
  ],
  metrics: [
    { id: 'users', label: 'Users', value: 12, detail: 'profiles' },
    { id: 'groups', label: 'Groups', value: 4, detail: 'active groups' },
  ],
  jobs: [
    {
      id: 'job-1',
      source: 'notification_jobs',
      jobType: 'send_now',
      status: 'failed',
      targetType: 'all',
      targetValue: null,
      targetCount: 2,
      resultSummary: { push_failed: 1 },
      errorMessage: 'push_410',
      createdAt: '2026-06-10T08:00:00.000Z',
      startedAt: '2026-06-10T08:00:01.000Z',
      finishedAt: '2026-06-10T08:00:02.000Z',
    },
  ],
  recentErrors: [
    {
      id: 'err-1',
      source: 'admin_audit_logs',
      action: 'notification.send_now',
      message: 'push_410',
      createdAt: '2026-06-10T08:00:02.000Z',
    },
  ],
}

vi.mock('../../lib/adminHealth', async () => {
  const actual = await vi.importActual<typeof import('../../lib/adminHealth')>('../../lib/adminHealth')
  return {
    ...actual,
    getAdminHealthSnapshot: vi.fn(async () => snapshot),
  }
})

let roots: Root[] = []

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
})

async function renderHealthPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(<ConsoleHealthPage />)
  })
  for (let i = 0; i < 30; i += 1) {
    if (container.textContent?.includes('send_now')) return container
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
  throw new Error('Health page did not render snapshot data')
}

describe('ConsoleHealthPage', () => {
  it('renders provider health, core metrics, recent jobs, and errors', async () => {
    const container = await renderHealthPage()

    expect(container.textContent).toContain('Dashboard vận hành')
    expect(container.textContent).toContain('Supabase/Auth')
    expect(container.textContent).toContain('AI provider')
    expect(container.textContent).toContain('Users')
    expect(container.textContent).toContain('12')
    expect(container.textContent).toContain('send_now')
    expect(container.textContent).toContain('push_410')
    expect(container.textContent).toContain('notification.send_now')
  })
})
