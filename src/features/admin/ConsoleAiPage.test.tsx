import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConsoleAiPage } from './ConsolePages'
import type { AdminAiSnapshot } from '../../lib/adminAi'

const snapshot: AdminAiSnapshot = {
  checkedAt: '2026-06-10T10:00:00.000Z',
  summaryStatus: 'configured',
  provider: {
    active: 'gemini',
    fallback: 'deepseek',
    geminiModel: 'gemini-2.0-flash',
    deepseekModel: 'deepseek-v4-flash',
    status: 'configured',
    detail: 'Gemini configured, DeepSeek fallback ready',
  },
  flags: [
    {
      key: 'ai_parse_expense',
      label: 'Nhập chi tự nhiên',
      enabled: true,
      description: 'Parser AI cho khoản chi',
      updatedAt: '2026-06-10T09:30:00.000Z',
    },
    {
      key: 'ai_ocr_receipt',
      label: 'OCR hoá đơn',
      enabled: false,
      description: 'Vision OCR cho hoá đơn',
      updatedAt: '2026-06-10T09:30:00.000Z',
    },
  ],
  quotas: [
    {
      feature: 'parse_expense',
      label: 'Nhập chi tự nhiên',
      freeLimit: 15,
      totalCount: 31,
      userCount: 12,
      remaining: null,
    },
  ],
  prompts: [
    {
      promptKey: 'parse_expense',
      version: 2,
      title: 'Parse v2',
      prompt: 'parse prompt {{text}}',
      active: true,
      updatedAt: '2026-06-10T09:00:00.000Z',
    },
  ],
  usageSummary: [
    {
      feature: 'parse_expense',
      label: 'Nhập chi tự nhiên',
      period: '2026-06',
      totalCount: 31,
      userCount: 12,
      topUsers: [{ userId: 'user-1', userEmail: 'a@example.com', displayName: 'An', count: 11 }],
    },
  ],
  usageRows: [
    {
      userId: 'user-1',
      userEmail: 'a@example.com',
      displayName: 'An',
      feature: 'parse_expense',
      period: '2026-06',
      count: 11,
      updatedAt: '2026-06-10T09:10:00.000Z',
    },
  ],
  recentErrors: [],
}

vi.mock('../../lib/adminAi', async () => {
  const actual = await vi.importActual<typeof import('../../lib/adminAi')>('../../lib/adminAi')
  return {
    ...actual,
    loadAdminAiSnapshot: vi.fn(async () => snapshot),
    saveAdminAiConfig: vi.fn(async () => ({ saved: true })),
    testAdminAiParse: vi.fn(async () => ({ parsed: { title: 'Cafe', amount: 50000 } })),
    testAdminAiOcr: vi.fn(async () => ({ items: [{ title: 'Bánh mì', amount: 25000 }] })),
    testAdminAiInsight: vi.fn(async () => ({ insight: { headline: 'Ổn', points: ['Không có bất thường'] } })),
    resetAdminAiQuota: vi.fn(async () => ({ reset: 1 })),
  }
})

let roots: Root[] = []

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
})

async function renderAiPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(<ConsoleAiPage />)
  })
  for (let i = 0; i < 30; i += 1) {
    if (container.textContent?.includes('a@example.com')) return container
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
  throw new Error('AI page did not render snapshot data')
}

describe('ConsoleAiPage', () => {
  it('renders AI config, usage, prompt versions, and test area', async () => {
    const container = await renderAiPage()

    expect(container.textContent).toContain('Điều hành AI')
    expect(container.textContent).toContain('Nhà cung cấp')
    expect(container.textContent).toContain('Cấu hình chạy')
    expect(container.textContent).toContain('Gemini configured')
    expect(container.textContent).toContain('Nhập chi tự nhiên')
    expect(container.textContent).toContain('OCR hoá đơn')
    expect(container.textContent).toContain('Parse v2')
    expect(container.textContent).toContain('a@example.com')
    expect(container.textContent).toContain('Test parser')
    expect(container.textContent).not.toContain('Runtime config')
  })
})
