import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConsoleJobsPage } from './ConsolePages'
import type { AdminHealthSnapshot } from '../../lib/adminHealth'

const snapshot: AdminHealthSnapshot = {
  checkedAt: '2026-06-11T09:00:00.000Z',
  summaryStatus: 'ok',
  cards: [],
  metrics: [],
  jobs: [
    {
      id: 'job-1',
      source: 'notification_jobs',
      jobType: 'send_now',
      status: 'failed',
      targetType: 'all',
      targetValue: null,
      targetCount: 42,
      resultSummary: { push_failed: 2, in_app_sent: 40 },
      errorMessage: 'push_410',
      createdAt: '2026-06-11T08:45:00.000Z',
      startedAt: '2026-06-11T08:45:01.000Z',
      finishedAt: '2026-06-11T08:45:03.000Z',
    },
    {
      id: 'job-2',
      source: 'admin_job_runs',
      jobType: 'health_check',
      status: 'succeeded',
      targetType: 'system',
      targetValue: null,
      targetCount: 0,
      resultSummary: { cards: 8 },
      errorMessage: null,
      createdAt: '2026-06-11T08:30:00.000Z',
      startedAt: null,
      finishedAt: '2026-06-11T08:30:01.000Z',
    },
  ],
  recentErrors: [
    {
      id: 'err-1',
      source: 'notification_jobs',
      action: 'send_now',
      message: 'push_410',
      createdAt: '2026-06-11T08:45:03.000Z',
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

async function renderJobsPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(<ConsoleJobsPage />)
  })
  for (let i = 0; i < 30; i += 1) {
    if (container.textContent?.includes('send_now')) return container
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
  throw new Error('Jobs page did not render job data')
}

describe('ConsoleJobsPage', () => {
  it('renders job monitor data and keeps retry/cancel actions locked', async () => {
    const container = await renderJobsPage()

    expect(container.textContent).toContain('Lịch chạy')
    expect(container.textContent).toContain('send_now')
    expect(container.textContent).toContain('health_check')
    expect(container.textContent).toContain('push_410')
    expect(container.textContent).toContain('Đang chờ')
    expect(container.textContent).toContain('Đang chạy')
    expect(container.textContent).toContain('Thất bại')
    expect(container.textContent).toContain('Đã kiểm tra')
    expect(container.textContent).toContain('Chi tiết tác vụ')
    expect(container.textContent).toContain('Retry/cancel đang khóa')
    expect(container.textContent).not.toContain('Queued')
    expect(container.textContent).not.toContain('Running')
    expect(container.textContent).not.toContain('Job detail')
  })
})
