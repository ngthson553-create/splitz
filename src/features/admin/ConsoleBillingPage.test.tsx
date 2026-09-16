import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConsoleBillingPage } from './ConsolePages'
import type { AdminBillingSnapshot } from '../../lib/adminBilling'

const snapshot: AdminBillingSnapshot = {
  checkedAt: '2026-06-10T12:00:00.000Z',
  summaryStatus: 'configured',
  provider: {
    status: 'configured',
    detail: 'PAYOS_CLIENT_ID/API_KEY/CHECKSUM_KEY configured',
    stalePendingCount: 1,
  },
  metrics: [
    { id: 'active_premium', label: 'Premium active', value: 4, detail: 'active subscriptions' },
  ],
  subscriptions: [
    {
      userId: 'user-1',
      userEmail: 'owner@example.com',
      displayName: 'Son',
      plan: 'personal',
      status: 'active',
      periodEnd: '2026-07-10T12:00:00.000Z',
      source: 'payos',
      teamId: null,
      daysLeft: 30,
      createdAt: '2026-06-10T10:00:00.000Z',
      updatedAt: '2026-06-10T11:00:00.000Z',
    },
  ],
  payments: [
    {
      orderCode: '202606101234',
      userId: 'user-1',
      userEmail: 'owner@example.com',
      displayName: 'Son',
      plan: 'personal',
      cycle: 'month',
      amount: 14000,
      status: 'paid',
      createdAt: '2026-06-10T10:00:00.000Z',
      paidAt: '2026-06-10T10:05:00.000Z',
    },
  ],
  recentErrors: [],
}

const lookup = {
  profile: { userId: 'user-1', email: 'owner@example.com', displayName: 'Son', avatarUrl: null },
  subscription: snapshot.subscriptions[0],
  payments: snapshot.payments,
  redemptions: [],
}

vi.mock('../../lib/adminBilling', async () => {
  const actual = await vi.importActual<typeof import('../../lib/adminBilling')>('../../lib/adminBilling')
  return {
    ...actual,
    loadAdminBillingSnapshot: vi.fn(async () => snapshot),
    lookupAdminBillingUser: vi.fn(async () => lookup),
    grantAdminPremium: vi.fn(async () => ({
      userId: 'user-1',
      userEmail: 'owner@example.com',
      displayName: 'Son',
      plan: 'team',
      status: 'active',
      source: 'manual',
      periodEnd: '2026-09-10T12:00:00.000Z',
    })),
  }
})

let roots: Root[] = []

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
})

async function renderBillingPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(<ConsoleBillingPage />)
  })
  for (let i = 0; i < 30; i += 1) {
    if (container.textContent?.includes('owner@example.com')) return container
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
  throw new Error('Billing page did not render snapshot data')
}

describe('ConsoleBillingPage', () => {
  it('renders PayOS health, subscriptions, payment orders, and manual grant panel', async () => {
    const container = await renderBillingPage()

    expect(container.textContent).toContain('Thanh toán / Premium')
    expect(container.textContent).toContain('PAYOS_CLIENT_ID/API_KEY/CHECKSUM_KEY configured')
    expect(container.textContent).toContain('owner@example.com')
    expect(container.textContent).toContain('202606101234')
    expect(container.textContent).toContain('Cấp thủ công')
    expect(container.textContent).toContain('Tra Premium')
    expect(container.textContent).not.toContain('Manual grant')
    expect(container.textContent).not.toContain('Lookup premium')
  })
})
