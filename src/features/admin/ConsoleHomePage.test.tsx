import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ConsoleHomePage } from './ConsolePages'
import { consoleModules } from './consoleModules'

let roots: Root[] = []

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
})

async function renderHome() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/console']}>
        <ConsoleHomePage />
      </MemoryRouter>,
    )
  })

  return container
}

describe('ConsoleHomePage', () => {
  it('presents a task-first no-code cockpit before advanced modules', async () => {
    const container = await renderHome()
    const moduleCount = `${consoleModules.length} module`

    expect(container.textContent).toContain('Hôm nay')
    expect(container.textContent).toContain('Trung tâm ưu tiên')
    expect(container.textContent).toContain('Việc nhanh')
    expect(container.textContent).toContain('Tạo mã Premium')
    expect(container.textContent).toContain('Gửi thông báo')
    expect(container.textContent).toContain('Kiểm tra user')
    expect(container.textContent).toContain('Bật banner bảo trì')
    expect(container.textContent).toContain('Nâng cao')
    expect(container.textContent).toContain('Lịch chạy')
    expect(container.textContent).toContain('Mở chế độ nâng cao')
    expect(container.textContent).not.toContain(moduleCount)
    expect(container.textContent).not.toContain('Module console')
  })

  it('opens a guided task flow with checklist and module handoff', async () => {
    const container = await renderHome()
    const premiumTask = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Tạo mã Premium'),
    )

    expect(premiumTask).toBeTruthy()
    await act(async () => {
      premiumTask?.click()
    })

    expect(container.textContent).toContain('Quy trình được hướng dẫn')
    expect(container.textContent).toContain('Trước khi làm')
    expect(container.textContent).toContain('Chọn số ngày Premium')
    expect(container.textContent).toContain('Kiểm tra code sau khi tạo')
    expect(container.textContent).toContain('Mở Mã Premium')
    expect(container.querySelector('a[href="/console/redeem"]')?.textContent).toContain('Mở Mã Premium')
  })

  it('groups operational checks into a smart issue center with priority handoffs', async () => {
    const container = await renderHome()

    expect(container.textContent).toContain('Trung tâm ưu tiên')
    expect(container.textContent).toContain('Ưu tiên cao')
    expect(container.textContent).toContain('Kiểm tra sức khỏe hệ thống')
    expect(container.textContent).toContain('Xem Lịch chạy')
    expect(container.textContent).toContain('Không chạy scan ngầm')
    expect(container.querySelector('a[href="/console/health"]')?.textContent).toContain('Mở Dashboard vận hành')
    expect(container.querySelector('a[href="/console/jobs"]')?.textContent).toContain('Xem Lịch chạy')
    expect(container.querySelector('a[href="/console/data-quality"]')?.textContent).toContain('Mở Kiểm tra dữ liệu')
  })

  it('keeps advanced modules behind an explicit advanced mode toggle', async () => {
    const container = await renderHome()
    const moduleCount = `${consoleModules.length} module`

    expect(container.textContent).toContain('Chế độ nâng cao đang tắt')
    expect(container.textContent).not.toContain(moduleCount)

    const advancedToggle = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Mở chế độ nâng cao'),
    )
    expect(advancedToggle).toBeTruthy()

    await act(async () => {
      advancedToggle?.click()
    })

    expect(container.textContent).toContain('Chế độ nâng cao đang bật')
    expect(container.textContent).toContain('Chỉ dùng khi cần đi sâu')
    expect(container.textContent).toContain(moduleCount)
    expect(container.querySelector('a[href="/console/admin-access"]')?.textContent).toContain('Quyền admin')
    expect(container.textContent).toContain('Ẩn chế độ nâng cao')
    expect(container.querySelector('a[href="/console/audit"]')?.textContent).toContain('Lịch sử thao tác')
  })
})
