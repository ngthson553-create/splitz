import { act, type HTMLAttributes, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QrSheet } from './QrSheet'
import type { Group, SettlementTransfer } from '../../lib/types'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const createSettlement = vi.hoisted(() => vi.fn(async () => 'settlement-1'))
const reload = vi.hoisted(() => vi.fn(async () => undefined))
const uploadSettlementProof = vi.hoisted(() => vi.fn(async () => undefined))
const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement> & { dragConstraints?: unknown; dragElastic?: unknown }) => {
      const domProps = { ...props }
      delete domProps.dragConstraints
      delete domProps.dragElastic
      return <div {...domProps}>{children}</div>
    },
  },
}))

vi.mock('../../lib/store', () => ({
  useStore: () => ({ createSettlement, reload }),
}))

vi.mock('../../components/Toast', () => ({
  useToast: () => toast,
}))

vi.mock('../../lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('../../lib/data/attachments', () => ({
  uploadSettlementProof,
}))

let roots: Root[] = []

function makeGroup({ hasBank = true }: { hasBank?: boolean } = {}): Group {
  return {
    id: 'group-1',
    name: 'Trip',
    createdAt: '2026-06-12T10:00:00.000Z',
    updatedAt: '2026-06-12T10:00:00.000Z',
    settlementMethod: 'smart_settle',
    members: [
      { id: 'member-me', name: 'Tôi', userId: 'user-me' },
      {
        id: 'member-son',
        name: 'Sơn',
        userId: 'user-son',
        bankCode: hasBank ? '970422' : undefined,
        bankAccountNumber: hasBank ? '0123456789' : undefined,
      },
    ],
    expenses: [],
    settlements: [],
  }
}

function makeTransfer(): SettlementTransfer {
  return {
    fromMemberId: 'member-me',
    toMemberId: 'member-son',
    amount: 50000,
    method: 'smart_settle',
    groupId: 'group-1',
  }
}

describe('QrSheet', () => {
  beforeEach(() => {
    createSettlement.mockClear()
    reload.mockClear()
    uploadSettlementProof.mockClear()
    toast.success.mockClear()
    toast.error.mockClear()
  })

  afterEach(() => {
    for (const root of roots) root.unmount()
    roots = []
    document.body.innerHTML = ''
  })

  async function renderQrSheet(props: { group: Group; transfer: SettlementTransfer; onClose: () => void }) {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    roots.push(root)
    await act(async () => {
      root.render(<QrSheet {...props} />)
    })
    return { container }
  }

  it('creates a pending settlement only from inside the payment sheet', async () => {
    const onClose = vi.fn()

    await renderQrSheet({ group: makeGroup(), transfer: makeTransfer(), onClose })

    const submit = Array.from(document.body.querySelectorAll('button')).find((button) =>
      button.textContent?.match(/tôi đã chuyển/i),
    )
    expect(submit).toBeTruthy()

    await act(async () => {
      submit?.click()
    })

    expect(createSettlement).toHaveBeenCalledWith('group-1', 'member-me', 'member-son', 50000)
    expect(onClose).toHaveBeenCalled()
  })

  it('supports alternative payment with proof upload from the same sheet', async () => {
    await renderQrSheet({ group: makeGroup(), transfer: makeTransfer(), onClose: vi.fn() })

    const input = document.body.querySelector('input[type="file"]') as HTMLInputElement | null
    expect(input).not.toBeNull()

    const file = new File(['proof'], 'bien-lai.pdf', { type: 'application/pdf' })
    Object.defineProperty(input!, 'files', {
      configurable: true,
      value: [file],
    })
    await act(async () => {
      input!.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(createSettlement).toHaveBeenCalledWith('group-1', 'member-me', 'member-son', 50000)
    expect(uploadSettlementProof).toHaveBeenCalledWith(
      'group-1',
      'settlement-1',
      expect.objectContaining({ name: 'bien-lai.pdf', type: 'application/pdf' }),
    )
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not let users mark a transfer as paid before a QR can be generated', async () => {
    await renderQrSheet({ group: makeGroup({ hasBank: false }), transfer: makeTransfer(), onClose: vi.fn() })

    const submit = Array.from(document.body.querySelectorAll('button')).find((button) =>
      button.textContent?.match(/tôi đã chuyển/i),
    )
    expect(submit).toBeTruthy()
    expect(submit).toBeDisabled()

    const alt = Array.from(document.body.querySelectorAll('button')).find((button) =>
      button.textContent?.match(/chứng từ/i),
    )
    expect(alt).toBeTruthy()

    await act(async () => {
      submit?.click()
    })

    expect(createSettlement).not.toHaveBeenCalled()
  })
})
