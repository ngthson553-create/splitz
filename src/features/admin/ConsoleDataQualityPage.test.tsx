import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConsoleDataQualityPage } from './ConsolePages'
import type { AdminDataQualitySnapshot } from '../../lib/adminDataQuality'

const snapshot: AdminDataQualitySnapshot = {
  scanId: 'scan-1',
  checkedAt: '2026-06-11T08:00:00.000Z',
  summary: { totalIssues: 3, critical: 1, warning: 2, info: 0, scannersRun: 6 },
  issues: [
    {
      id: 'issue-1',
      scanner: 'expenses_missing_party',
      severity: 'critical',
      title: 'Expense thiếu payer',
      detail: 'Khoản chi Dinner không có người trả.',
      targetType: 'expense',
      targetId: 'expense-1',
      detectedAt: '2026-06-11T08:00:00.000Z',
      metadata: { group_id: 'group-1' },
    },
    {
      id: 'issue-2',
      scanner: 'redeem_count_mismatch',
      severity: 'warning',
      title: 'Redeem used_count lệch',
      detail: 'Code SPLITZ có used_count 4 nhưng lịch sử là 3.',
      targetType: 'redemption_code',
      targetId: 'SPLITZ',
      detectedAt: '2026-06-11T08:00:00.000Z',
      metadata: { used_count: 4, actual_uses: 3 },
    },
  ],
  recentScans: [
    { id: 'scan-1', checkedAt: '2026-06-11T08:00:00.000Z', totalIssues: 3, critical: 1, warning: 2, info: 0 },
  ],
}

vi.mock('../../lib/adminDataQuality', async () => {
  const actual = await vi.importActual<typeof import('../../lib/adminDataQuality')>('../../lib/adminDataQuality')
  return {
    ...actual,
    loadAdminDataQualitySnapshot: vi.fn(async () => snapshot),
  }
})

let roots: Root[] = []

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
})

async function renderDataQualityPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(<ConsoleDataQualityPage />)
  })
  for (let i = 0; i < 30; i += 1) {
    if (container.textContent?.includes('Expense thiếu payer')) return container
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
  throw new Error('Kiểm tra dữ liệu page did not render scan data')
}

describe('ConsoleDataQualityPage', () => {
  it('renders scanner summary, issue detail, and locked cleanup guidance', async () => {
    const container = await renderDataQualityPage()

    expect(container.textContent).toContain('Kiểm tra dữ liệu')
    expect(container.textContent).toContain('Bộ quét chỉ đọc')
    expect(container.textContent).toContain('Nghiêm trọng')
    expect(container.textContent).toContain('Cảnh báo')
    expect(container.textContent).toContain('Thông tin')
    expect(container.textContent).toContain('Expense thiếu payer')
    expect(container.textContent).toContain('Redeem used_count lệch')
    expect(container.textContent).toContain('Cleanup đang khóa')
    expect(container.textContent).toContain('scan-1')
    expect(container.textContent).not.toContain('Read-only scanner')
    expect(container.textContent).not.toContain('Critical')
    expect(container.textContent).not.toContain('Warning')
  })
})
