import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConsoleReleasesPage } from './ConsolePages'
import type { AdminReleasesSnapshot } from '../../lib/adminReleases'

const snapshot: AdminReleasesSnapshot = {
  checkedAt: '2026-06-10T17:20:00.000Z',
  summary: { total: 2, draft: 1, published: 1, cancelled: 0 },
  releases: [
    {
      id: 'release-1',
      version: '1.2.0',
      title: 'Splitz 1.2.0',
      body: 'Console vận hành đã có release notes.',
      status: 'published',
      audience: 'all',
      href: '/notifications',
      notificationId: 'notification-1',
      publishedAt: '2026-06-10T17:00:00.000Z',
      createdAt: '2026-06-10T16:00:00.000Z',
      updatedAt: '2026-06-10T17:00:00.000Z',
    },
    {
      id: 'release-2',
      version: '1.3.0',
      title: 'Splitz 1.3.0',
      body: 'Draft tiếp theo.',
      status: 'draft',
      audience: 'premium',
      href: '/notifications',
      notificationId: null,
      publishedAt: null,
      createdAt: '2026-06-10T17:05:00.000Z',
      updatedAt: '2026-06-10T17:05:00.000Z',
    },
  ],
  recentChanges: [],
}

const mocks = vi.hoisted(() => ({
  saveAdminReleaseDraft: vi.fn(async () => 'release-2'),
  publishAdminRelease: vi.fn(async () => ({ releaseId: 'release-2', notificationId: 'notification-2', targetCount: 5, inAppSent: 5 })),
  cancelAdminRelease: vi.fn(async () => true),
}))

vi.mock('../../lib/adminReleases', async () => {
  const actual = await vi.importActual<typeof import('../../lib/adminReleases')>('../../lib/adminReleases')
  return {
    ...actual,
    loadAdminReleasesSnapshot: vi.fn(async () => snapshot),
    saveAdminReleaseDraft: mocks.saveAdminReleaseDraft,
    publishAdminRelease: mocks.publishAdminRelease,
    cancelAdminRelease: mocks.cancelAdminRelease,
  }
})

let roots: Root[] = []

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

async function renderReleasesPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(<ConsoleReleasesPage />)
  })
  for (let i = 0; i < 30; i += 1) {
    if (container.textContent?.includes('Splitz 1.2.0')) return container
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
  throw new Error('Releases page did not render snapshot data')
}

describe('ConsoleReleasesPage', () => {
  it('renders release note draft, preview, history, and actions', async () => {
    const container = await renderReleasesPage()

    expect(container.textContent).toContain('Thông báo phiên bản')
    expect(container.textContent).toContain('Splitz 1.2.0')
    expect(container.textContent).toContain('Draft tiếp theo.')
    expect(container.textContent).toContain('Xem trước trong app')

    expect(container.textContent).toContain('Lưu nháp')
    expect(container.textContent).toContain('Xuất bản')
    expect(container.textContent).toContain('Hủy')
    expect(container.textContent).not.toContain('Draft editor')
    expect(container.textContent).not.toContain('Selected draft')
    expect(container.textContent).not.toContain('Recent release audit')
    expect(mocks.saveAdminReleaseDraft).not.toHaveBeenCalled()
  })
})
