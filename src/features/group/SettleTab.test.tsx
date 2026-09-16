import { act, type HTMLAttributes } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { SettleTab } from './SettleTab'
import type { Group } from '../../lib/types'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const storeState = vi.hoisted(() => ({
  mode: 'cloud' as const,
  createSettlement: vi.fn(),
  confirmSettlement: vi.fn(),
  cancelSettlement: vi.fn(),
}))

const authState = vi.hoisted(() => ({
  profile: { id: 'user-me' },
}))

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  show: vi.fn(),
}))

const confirm = vi.hoisted(() => vi.fn(async () => true))
const reminderMocks = vi.hoisted(() => ({
  listMyDebtReminders: vi.fn(async () => new Map<string, number>()),
  remindDebts: vi.fn(async () => ({ sent: 1, results: [] })),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}))

vi.mock('../../lib/store', () => ({
  useStore: () => storeState,
}))

vi.mock('../../lib/auth', () => ({
  useAuth: () => authState,
}))

vi.mock('../../components/Toast', () => ({
  useToast: () => toast,
}))

vi.mock('../../components/ConfirmDialog', () => ({
  useConfirm: () => confirm,
}))

vi.mock('../../lib/data/reminders', () => ({
  listMyDebtReminders: reminderMocks.listMyDebtReminders,
  remindDebts: reminderMocks.remindDebts,
}))

let roots: Root[] = []

function makeGroup(): Group {
  return {
    id: 'group-1',
    name: 'Trip',
    createdAt: '2026-06-12T10:00:00.000Z',
    updatedAt: '2026-06-12T10:00:00.000Z',
    settlementMethod: 'smart_settle',
    members: [
      { id: 'member-me', name: 'Tôi', userId: 'user-me' },
      { id: 'member-son', name: 'Sơn', userId: 'user-son', bankCode: '970422', bankAccountNumber: '0123456789' },
    ],
    expenses: [
      {
        id: 'expense-1',
        groupId: 'group-1',
        title: 'Ăn tối',
        amount: 100000,
        paidAt: '2026-06-12T10:00:00.000Z',
        splitMode: 'equal',
        payers: [{ memberId: 'member-son', amount: 100000 }],
        participants: [{ memberId: 'member-me' }, { memberId: 'member-son' }],
      },
    ],
    settlements: [],
  }
}

describe('SettleTab', () => {
  beforeEach(() => {
    storeState.createSettlement.mockReset()
    storeState.confirmSettlement.mockReset()
    storeState.cancelSettlement.mockReset()
    toast.success.mockReset()
    toast.error.mockReset()
    toast.show.mockReset()
    confirm.mockClear()
    reminderMocks.listMyDebtReminders.mockClear()
    reminderMocks.remindDebts.mockClear()
  })

  afterEach(() => {
    for (const root of roots) root.unmount()
    roots = []
    document.body.innerHTML = ''
  })

  async function renderSettleTab(group: Group, onShowQr: (transfer: unknown) => void) {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    roots.push(root)
    await act(async () => {
      root.render(<SettleTab group={group} onShowQr={onShowQr} />)
    })
    return container
  }

  it('forces the debtor to open the payment sheet instead of marking paid inline', async () => {
    const onShowQr = vi.fn()

    const container = await renderSettleTab(makeGroup(), onShowQr)

    const buttons = Array.from(container.querySelectorAll('button'))
    const payButton = buttons.find((button) => button.textContent?.match(/thanh toán/i))
    expect(payButton).toBeTruthy()
    expect(container.textContent).not.toContain('Tôi đã chuyển')

    payButton?.click()

    expect(onShowQr).toHaveBeenCalledWith(
      expect.objectContaining({
        fromMemberId: 'member-me',
        toMemberId: 'member-son',
        amount: 50000,
      }),
    )
  })
})
