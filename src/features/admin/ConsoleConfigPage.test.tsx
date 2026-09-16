import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConsoleConfigPage } from './ConsolePages'
import type { AdminConfigSnapshot } from '../../lib/adminConfig'

const snapshot: AdminConfigSnapshot = {
  checkedAt: '2026-06-10T10:00:00.000Z',
  summaryStatus: 'configured',
  flags: [
    {
      key: 'payments',
      label: 'Thanh toán PayOS',
      description: 'Bật/tắt tạo đơn PayOS.',
      enabled: true,
      category: 'growth',
      dangerous: true,
      updatedAt: '2026-06-10T09:00:00.000Z',
    },
    {
      key: 'zalo_login',
      label: 'Đăng nhập Zalo',
      description: 'Bật/tắt luồng Zalo login.',
      enabled: true,
      category: 'auth',
      dangerous: false,
      updatedAt: '2026-06-10T09:00:00.000Z',
    },
  ],
  limits: {
    freeMaxGroups: 3,
    freeMaxMembers: 8,
    premiumMaxGroups: null,
    premiumMaxMembers: 25,
    parseFree: 15,
    ocrFree: 3,
    insightFree: 3,
    debtCooldownHours: 24,
    redeemDurationDays: 30,
    redeemMaxUses: 1,
  },
  maintenance: {
    enabled: false,
    title: 'Bảo trì hệ thống',
    message: '',
    severity: 'info',
    startsAt: null,
    endsAt: null,
    updatedAt: null,
  },
  disclaimer: {
    payment: 'Thanh toán xử lý qua PayOS.',
    legal: 'Splitz hỗ trợ chia tiền, không phải ví điện tử.',
    updatedAt: '2026-06-10T09:40:00.000Z',
  },
  recentChanges: [],
}

vi.mock('../../lib/adminConfig', async () => {
  const actual = await vi.importActual<typeof import('../../lib/adminConfig')>('../../lib/adminConfig')
  return {
    ...actual,
    loadAdminConfigSnapshot: vi.fn(async () => snapshot),
    saveAdminFeatureFlags: vi.fn(async () => true),
    saveAdminLimits: vi.fn(async () => true),
    saveAdminMaintenance: vi.fn(async () => true),
    saveAdminDisclaimer: vi.fn(async () => true),
  }
})

let roots: Root[] = []

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
})

async function renderConfigPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(<ConsoleConfigPage />)
  })
  for (let i = 0; i < 30; i += 1) {
    if (container.textContent?.includes('Thanh toán PayOS')) return container
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
  throw new Error('Config page did not render snapshot data')
}

async function clickTab(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll('button')).find((node) => node.textContent === label)
  if (!button) throw new Error(`Missing tab: ${label}`)
  await act(async () => {
    button.click()
  })
}

describe('ConsoleConfigPage', () => {
  it('renders feature flags, limits, maintenance, and disclaimer sections', async () => {
    const container = await renderConfigPage()

    expect(container.textContent).toContain('Cài đặt hệ thống')
    expect(container.textContent).toContain('Cờ tính năng')
    expect(container.textContent).toContain('Thanh toán PayOS')

    await clickTab(container, 'Giới hạn gói')
    expect(container.textContent).toContain('Giới hạn gói')

    await clickTab(container, 'Bảo trì')
    expect(container.textContent).toContain('Banner bảo trì')

    await clickTab(container, 'Tuyên bố')
    expect(container.textContent).toContain('Tuyên bố pháp lý / thanh toán')
    expect(container.textContent).not.toContain('Feature flags')
    expect(container.textContent).not.toContain('Maintenance banner')
  })
})
