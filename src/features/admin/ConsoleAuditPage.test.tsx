import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConsoleAuditPage } from './ConsolePages'
import type { AdminAuditLog } from '../../lib/adminAudit'

const auditLogs: AdminAuditLog[] = [
  {
    id: 'audit-1',
    actorUserId: 'user-1',
    actorEmail: 'owner@example.com',
    actorRole: 'owner',
    action: 'redeem.create',
    targetType: 'redemption_code',
    targetId: 'SPLITZ30',
    payloadSummary: { code: 'SPLITZ30', token: '[redacted]' },
    status: 'success',
    errorMessage: null,
    createdAt: '2026-06-10T07:00:00.000Z',
  },
]

vi.mock('../../lib/adminAudit', async () => {
  const actual = await vi.importActual<typeof import('../../lib/adminAudit')>('../../lib/adminAudit')
  return {
    ...actual,
    listAdminAuditLogs: vi.fn(async () => auditLogs),
  }
})

let roots: Root[] = []

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
})

async function renderAuditPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(<ConsoleAuditPage />)
  })
  for (let i = 0; i < 20; i += 1) {
    if (container.textContent?.includes('redeem.create')) return container
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
  throw new Error('Audit page did not render RPC data')
}

describe('ConsoleAuditPage', () => {
  it('renders audit rows and a readable selected detail panel', async () => {
    const container = await renderAuditPage()

    expect(container.textContent).toContain('redeem.create')
    expect(container.textContent).toContain('owner@example.com')
    expect(container.textContent).toContain('Thành công')
    expect(container.textContent).toContain('SPLITZ30')
    expect(container.textContent).toContain('[redacted]')
  })
})
