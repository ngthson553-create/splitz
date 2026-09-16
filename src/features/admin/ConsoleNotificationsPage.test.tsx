import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConsoleNotificationsPage } from './ConsolePages'
import type { AdminNotificationCampaign, AdminNotificationDelivery } from '../../lib/adminNotifications'

const campaigns: AdminNotificationCampaign[] = [
  {
    id: 'ntf-1',
    title: 'Bảo trì hệ thống',
    body: 'Splitz bảo trì lúc 22:00.',
    href: '/notifications',
    targetType: 'all',
    targetValue: null,
    status: 'sent',
    channelInApp: true,
    channelWebPush: true,
    targetCount: 2,
    inAppSent: 2,
    pushSent: 1,
    pushFailed: 1,
    createdAt: '2026-06-10T08:00:00.000Z',
    sentAt: '2026-06-10T08:00:01.000Z',
  },
]

const deliveries: AdminNotificationDelivery[] = [
  {
    id: 'delivery-1',
    notificationId: 'ntf-1',
    userId: 'user-1',
    userEmail: 'a@example.com',
    channel: 'in_app',
    status: 'sent',
    errorMessage: null,
    sentAt: '2026-06-10T08:00:00.000Z',
    readAt: null,
    createdAt: '2026-06-10T08:00:00.000Z',
  },
  {
    id: 'delivery-2',
    notificationId: 'ntf-1',
    userId: null,
    userEmail: null,
    channel: 'web_push',
    status: 'failed',
    errorMessage: 'push_410',
    sentAt: null,
    readAt: null,
    createdAt: '2026-06-10T08:00:02.000Z',
  },
]

vi.mock('../../lib/adminNotifications', async () => {
  const actual = await vi.importActual<typeof import('../../lib/adminNotifications')>('../../lib/adminNotifications')
  return {
    ...actual,
    listAdminNotifications: vi.fn(async () => campaigns),
    listAdminNotificationDeliveries: vi.fn(async () => deliveries),
    previewAdminNotificationTarget: vi.fn(async () => ({ targetCount: 2, pushSubscriberCount: 1 })),
    sendAdminNotificationNow: vi.fn(async () => ({
      notificationId: 'ntf-1',
      jobId: 'job-1',
      targetCount: 2,
      inAppSent: 2,
      pushSent: 1,
      pushFailed: 1,
    })),
  }
})

let roots: Root[] = []

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
})

async function renderNotificationsPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(<ConsoleNotificationsPage />)
  })
  for (let i = 0; i < 30; i += 1) {
    if (container.textContent?.includes('a@example.com')) return container
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
  throw new Error('Notifications page did not render campaign data')
}

describe('ConsoleNotificationsPage', () => {
  it('renders campaign metrics and delivery details', async () => {
    const container = await renderNotificationsPage()

    expect(container.textContent).toContain('Thông báo hệ thống')
    expect(container.textContent).toContain('Bảo trì hệ thống')
    expect(container.textContent).toContain('Tất cả user')
    expect(container.textContent).toContain('2')
    expect(container.textContent).toContain('a@example.com')
    expect(container.textContent).toContain('Chưa rõ user')
    expect(container.textContent).toContain('1 đã gửi / 1 lỗi')
    expect(container.textContent).toContain('in-app')
    expect(container.textContent).not.toContain('Unknown user')
    expect(container.textContent).not.toContain('sent /')
    expect(container.textContent).not.toContain('failed')
  })
})
