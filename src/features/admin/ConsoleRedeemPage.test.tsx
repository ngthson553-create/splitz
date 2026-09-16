import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConsoleRedeemPage } from './ConsolePages'
import type { AdminRedeemCode } from '../../lib/adminRedeem'

const redeemCodes: AdminRedeemCode[] = [
  {
    code: 'SPLITZ30',
    plan: 'personal',
    durationDays: 30,
    maxUses: 1,
    usedCount: 0,
    status: 'active',
    expiresAt: '2026-07-10T00:00:00.000Z',
    createdAt: '2026-06-10T07:00:00.000Z',
    internalNote: 'launch batch',
    batchId: 'batch-1',
    batchPrefix: 'SPLITZ',
    uses: [
      {
        id: 'use-1',
        usedBy: null,
        usedEmail: null,
        usedAt: '2026-06-10T08:00:00.000Z',
      },
    ],
  },
]

vi.mock('../../lib/adminRedeem', async () => {
  const actual = await vi.importActual<typeof import('../../lib/adminRedeem')>('../../lib/adminRedeem')
  return {
    ...actual,
    listAdminRedeemCodes: vi.fn(async () => redeemCodes),
    lookupAdminRedeemCode: vi.fn(async () => redeemCodes[0]),
    createAdminRedeemCode: vi.fn(async () => 'SPLITZ30'),
    createAdminRedeemBatch: vi.fn(async () => ({ batchId: 'batch-1', codes: ['SPLITZ30'] })),
    revokeAdminRedeemCode: vi.fn(async () => 'SPLITZ30'),
  }
})

let roots: Root[] = []

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
})

async function renderRedeemPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(<ConsoleRedeemPage />)
  })
  for (let i = 0; i < 20; i += 1) {
    if (container.textContent?.includes('SPLITZ30')) return container
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
  throw new Error('Redeem page did not render RPC data')
}

describe('ConsoleRedeemPage', () => {
  it('renders redeem codes with operational details', async () => {
    const container = await renderRedeemPage()

    expect(container.textContent).toContain('Mã Premium')
    expect(container.textContent).toContain('SPLITZ30')
    expect(container.textContent).toContain('Cá nhân')
    expect(container.textContent).toContain('Đang hoạt động')
    expect(container.textContent).toContain('0/1')
    expect(container.textContent).toContain('Chưa rõ user')
    expect(container.textContent).not.toContain('Unknown user')
    expect(container.textContent).not.toContain('Audit required')
    expect(container.textContent).not.toContain('Active')
    expect(container.textContent).not.toContain('Batch')
    expect(container.textContent).not.toContain('Copy')
  })
})
