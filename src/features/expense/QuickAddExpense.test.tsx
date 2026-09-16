import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QuickAddExpense } from './QuickAddExpense'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const reload = vi.hoisted(() => vi.fn(async () => undefined))
const storeState = vi.hoisted(() => ({
  groups: [],
  loading: false,
  error: 'Mất kết nối tới máy chủ.' as string | null,
  reload,
}))

vi.mock('../../lib/store', () => ({
  useStore: () => storeState,
}))

vi.mock('../../components/Sheet', () => ({
  Sheet: ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) =>
    open ? (
      <div data-testid="sheet">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}))

vi.mock('./ExpenseSheet', () => ({
  ExpenseSheet: () => <div>Expense sheet</div>,
}))

let roots: Root[] = []

describe('QuickAddExpense', () => {
  beforeEach(() => {
    reload.mockClear()
    storeState.groups = []
    storeState.loading = false
    storeState.error = 'Mất kết nối tới máy chủ.'
  })

  afterEach(() => {
    for (const root of roots) root.unmount()
    roots = []
    document.body.innerHTML = ''
  })

  async function renderQuickAddExpense() {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    roots.push(root)
    await act(async () => {
      root.render(<QuickAddExpense open onClose={() => undefined} onCreateGroup={() => undefined} />)
    })
  }

  it('shows a retry state instead of the empty-group prompt when group loading fails', async () => {
    await renderQuickAddExpense()

    expect(document.body.textContent).toContain('Không tải được nhóm')
    expect(document.body.textContent).toContain('Mất kết nối tới máy chủ.')
    expect(document.body.textContent).not.toContain('Bạn chưa có nhóm nào')

    const retry = Array.from(document.body.querySelectorAll('button')).find((button) =>
      button.textContent?.match(/thử lại/i),
    )
    expect(retry).toBeTruthy()

    await act(async () => {
      retry?.click()
    })

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('shows a loading state instead of the empty-group prompt while groups are still loading', async () => {
    storeState.loading = true
    storeState.error = null

    await renderQuickAddExpense()

    expect(document.body.textContent).toContain('Đang tải nhóm')
    expect(document.body.textContent).not.toContain('Bạn chưa có nhóm nào')
  })
})
