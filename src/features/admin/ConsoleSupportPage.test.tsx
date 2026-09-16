import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConsoleSupportPage } from './ConsolePages'
import type { AdminSupportSnapshot, AdminSupportUserSearchResult } from '../../lib/adminSupport'

const searchRows: AdminSupportUserSearchResult[] = [
  {
    userId: 'user-1',
    email: 'owner@example.com',
    displayName: 'Son',
    avatarUrl: null,
    onboarded: true,
    bankConfigured: true,
    groupCount: 1,
    premiumPlan: 'personal',
    createdAt: '2026-06-10T08:00:00.000Z',
  },
]

const snapshot: AdminSupportSnapshot = {
  checkedAt: '2026-06-10T09:00:00.000Z',
  profile: {
    userId: 'user-1',
    email: 'owner@example.com',
    displayName: 'Son',
    avatarUrl: null,
    onboardedAt: '2026-06-10T08:10:00.000Z',
    createdAt: '2026-06-10T08:00:00.000Z',
    updatedAt: '2026-06-10T08:30:00.000Z',
    bankConfigured: true,
    bankCode: '970436',
    bankAccountLast4: '6789',
  },
  groups: [
    {
      groupId: 'group-1',
      name: 'Da Nang trip',
      emoji: '🏖️',
      baseCurrency: 'VND',
      settlementMethod: 'smart_settle',
      ownerId: 'user-1',
      ownerEmail: 'owner@example.com',
      memberId: 'member-1',
      memberName: 'Son',
      memberRole: 'owner',
      isOwner: true,
      memberCount: 3,
      expenseCount: 8,
      settlementCount: 1,
      createdAt: '2026-06-10T08:20:00.000Z',
      updatedAt: '2026-06-10T08:40:00.000Z',
      version: 4,
      members: [
        {
          memberId: 'member-1',
          userId: 'user-1',
          email: 'owner@example.com',
          name: 'Son',
          role: 'owner',
          bankConfigured: true,
          joinedAt: '2026-06-10T08:20:00.000Z',
        },
      ],
    },
  ],
  subscription: {
    userId: 'user-1',
    plan: 'personal',
    status: 'active',
    periodEnd: '2026-07-10T09:00:00.000Z',
    source: 'payos',
    teamId: null,
    daysLeft: 30,
    createdAt: '2026-06-10T08:00:00.000Z',
    updatedAt: '2026-06-10T08:50:00.000Z',
  },
  payments: [
    {
      orderCode: '202606101234',
      plan: 'personal',
      cycle: 'month',
      amount: 14000,
      status: 'paid',
      createdAt: '2026-06-10T08:00:00.000Z',
      paidAt: '2026-06-10T08:01:00.000Z',
    },
  ],
  redemptions: [
    { id: 'use-1', code: 'SPLITZ30', plan: 'personal', durationDays: 30, usedAt: '2026-06-10T08:02:00.000Z' },
  ],
  aiUsage: [{ feature: 'parse_expense', period: '2026-06', count: 5, updatedAt: '2026-06-10T08:30:00.000Z' }],
  push: {
    subscriptionCount: 2,
    latestCreatedAt: '2026-06-10T08:30:00.000Z',
    endpointHosts: [{ host: 'fcm.googleapis.com', count: 2 }],
  },
}

vi.mock('../../lib/adminSupport', async () => {
  const actual = await vi.importActual<typeof import('../../lib/adminSupport')>('../../lib/adminSupport')
  return {
    ...actual,
    searchAdminSupportUsers: vi.fn(async () => searchRows),
    loadAdminSupportUser: vi.fn(async () => snapshot),
  }
})

let roots: Root[] = []

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
})

async function renderAndSearchSupportPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(<ConsoleSupportPage initialQuery="owner@example.com" autoSearch />)
  })

  for (let i = 0; i < 30; i += 1) {
    if (container.textContent?.includes('Đã cấu hình ngân hàng')) return container
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
  throw new Error('Support page did not render snapshot data')
}

describe('ConsoleSupportPage', () => {
  it('renders a read-only user support snapshot after lookup', async () => {
    const container = await renderAndSearchSupportPage()

    expect(container.textContent).toContain('Hỗ trợ user / nhóm')
    expect(container.textContent).toContain('Chỉ đọc')
    expect(container.textContent).toContain('owner@example.com')
    expect(container.textContent).toContain('Đã cấu hình ngân hàng')
    expect(container.textContent).toContain('Đơn thanh toán')
    expect(container.textContent).toContain('Thiết bị nhận push')
    expect(container.textContent).toContain('AI / Push')
    expect(container.textContent).not.toContain('Read-only')
    expect(container.textContent).not.toContain('Payment orders')
  })
})
