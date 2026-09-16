import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConsoleAdminAccessPage } from './ConsoleAdminAccessPage'
import type { AdminAccessSnapshot } from '../../lib/adminAccess'

const snapshot: AdminAccessSnapshot = {
  checkedAt: '2026-06-11T09:00:00.000Z',
  summary: { total: 2, active: 1, disabled: 1, owners: 1 },
  admins: [
    {
      userId: 'owner-1',
      email: 'owner@example.com',
      displayName: 'Sơn',
      avatarUrl: null,
      role: 'owner',
      status: 'active',
      createdAt: '2026-06-10T08:00:00.000Z',
      createdByEmail: 'owner@example.com',
    },
    {
      userId: 'support-1',
      email: 'support@example.com',
      displayName: 'Support',
      avatarUrl: null,
      role: 'support',
      status: 'disabled',
      createdAt: '2026-06-10T09:00:00.000Z',
      createdByEmail: 'owner@example.com',
    },
  ],
  recentChanges: [{ id: 'audit-1', action: 'admin_access.upsert', actorEmail: 'owner@example.com', createdAt: '2026-06-11T08:55:00.000Z' }],
}

const candidate = {
  userId: 'user-2',
  email: 'newadmin@example.com',
  displayName: 'New Admin',
  avatarUrl: null,
  createdAt: '2026-06-11T08:00:00.000Z',
  alreadyAdmin: false,
}

const mocks = vi.hoisted(() => ({
  loadAdminAccessSnapshot: vi.fn(),
  searchAdminAccessProfiles: vi.fn(),
  upsertAdminAccess: vi.fn(async () => true),
  disableAdminAccess: vi.fn(async () => true),
}))

vi.mock('../../lib/adminAccess', async () => {
  const actual = await vi.importActual<typeof import('../../lib/adminAccess')>('../../lib/adminAccess')
  return {
    ...actual,
    loadAdminAccessSnapshot: mocks.loadAdminAccessSnapshot,
    searchAdminAccessProfiles: mocks.searchAdminAccessProfiles,
    upsertAdminAccess: mocks.upsertAdminAccess,
    disableAdminAccess: mocks.disableAdminAccess,
  }
})

let roots: Root[] = []

beforeEach(() => {
  mocks.loadAdminAccessSnapshot.mockResolvedValue(snapshot)
  mocks.searchAdminAccessProfiles.mockResolvedValue([candidate])
})

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
  mocks.loadAdminAccessSnapshot.mockReset()
  mocks.searchAdminAccessProfiles.mockReset()
  mocks.upsertAdminAccess.mockClear()
})

async function renderAdminAccessPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(<ConsoleAdminAccessPage />)
  })
  for (let i = 0; i < 30; i += 1) {
    if (container.textContent?.includes('owner@example.com')) return container
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
  throw new Error('Admin access page did not render snapshot data')
}

function changeInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('ConsoleAdminAccessPage', () => {
  it('renders admin roles, audit guidance, and invite workflow without raw SQL', async () => {
    const container = await renderAdminAccessPage()

    expect(container.textContent).toContain('Quyền admin')
    expect(container.textContent).toContain('owner@example.com')
    expect(container.textContent).toContain('Support')
    expect(container.textContent).toContain('Đã tắt')
    expect(container.textContent).toContain('Thêm admin')
    expect(container.textContent).toContain('Lý do audit')
    expect(container.textContent).toContain('admin_access.upsert')
    expect(container.textContent).not.toContain('raw SQL')
  })

  it('requires reason and confirmation before granting access', async () => {
    const container = await renderAdminAccessPage()
    const input = container.querySelector('input[placeholder="Email hoặc user id"]') as HTMLInputElement | null
    expect(input).toBeTruthy()
    await act(async () => {
      changeInput(input!, 'newadmin@example.com')
    })

    const searchButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Tìm profile'))
    await act(async () => {
      searchButton?.click()
    })
    expect(container.textContent).toContain('newadmin@example.com')

    const grantButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Cấp quyền'))
    await act(async () => {
      grantButton?.click()
    })

    expect(mocks.upsertAdminAccess).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Cần nhập lý do và tick xác nhận trước khi cấp quyền admin.')
  })
})
