import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConsoleEmailPage } from './ConsolePages'
import type { AdminEmailSnapshot } from '../../lib/adminEmail'

const snapshot: AdminEmailSnapshot = {
  checkedAt: '2026-06-10T10:00:00.000Z',
  summaryStatus: 'configured',
  defaultToEmail: 'owner@example.com',
  provider: {
    status: 'configured',
    from: 'Splitz <noreply@example.com>',
    replyTo: null,
    detail: 'RESEND_API_KEY configured',
  },
  metrics: [
    { id: 'sent_7d', label: 'Đã gửi 7 ngày', value: 8, detail: 'Resend' },
  ],
  templates: [
    {
      key: 'premium_reminder',
      name: 'Premium reminder',
      category: 'reminder',
      subject: 'Gói Splitz Premium của bạn sắp hết hạn',
      description: 'Nhắc gia hạn premium',
      active: true,
      updatedAt: '2026-06-10T09:30:00.000Z',
    },
  ],
  logs: [
    {
      id: 'log-1',
      templateKey: 'system_test',
      toEmail: 'owner@example.com',
      fromEmail: 'Splitz <noreply@example.com>',
      subject: 'Test Splitz',
      status: 'sent',
      provider: 'resend',
      providerMessageId: 'email-123',
      errorMessage: null,
      sentAt: '2026-06-10T09:40:00.000Z',
      createdAt: '2026-06-10T09:39:00.000Z',
    },
  ],
  recentErrors: [],
}

vi.mock('../../lib/adminEmail', async () => {
  const actual = await vi.importActual<typeof import('../../lib/adminEmail')>('../../lib/adminEmail')
  return {
    ...actual,
    loadAdminEmailSnapshot: vi.fn(async () => snapshot),
    sendAdminTestEmail: vi.fn(async () => ({ logId: 'log-2', status: 'sent', providerMessageId: 'email-456' })),
  }
})

let roots: Root[] = []

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
})

async function renderEmailPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(<ConsoleEmailPage />)
  })
  for (let i = 0; i < 30; i += 1) {
    if (container.textContent?.includes('Premium reminder')) return container
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
  throw new Error('Email page did not render snapshot data')
}

describe('ConsoleEmailPage', () => {
  it('renders Resend health, templates, test composer, and delivery logs', async () => {
    const container = await renderEmailPage()

    expect(container.textContent).toContain('Email / Resend')
    expect(container.textContent).toContain('RESEND_API_KEY configured')
    expect(container.textContent).toContain('owner@example.com')
    expect(container.textContent).toContain('Premium reminder')
    expect(container.textContent).toContain('Test Splitz')
    expect(container.textContent).toContain('Gửi test email')
  })
})
