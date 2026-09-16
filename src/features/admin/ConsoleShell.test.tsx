import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { ConsoleAccessContext } from './ConsoleAccessContext'
import { ConsoleShell } from './ConsoleShell'

let roots: Root[] = []

afterEach(() => {
  for (const root of roots) root.unmount()
  roots = []
  document.body.innerHTML = ''
})

async function renderShell(path = '/console/data-quality') {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <ConsoleAccessContext.Provider value={{ userId: 'admin-1', role: 'owner', email: 'owner@example.com' }}>
          <Routes>
            <Route path="/console/*" element={<ConsoleShell />}>
              <Route path="data-quality" element={<div>Kiểm tra dữ liệu content</div>} />
            </Route>
          </Routes>
        </ConsoleAccessContext.Provider>
      </MemoryRouter>,
    )
  })
  return container
}

describe('ConsoleShell', () => {
  it('keeps the module directory collapsed until advanced navigation is opened', async () => {
    const container = await renderShell()

    expect(container.textContent).toContain('owner@example.com')
    expect(container.textContent).toContain('Phase 21')
    expect(container.querySelector('[aria-label="Mobile console modules"]')?.textContent).toContain('Kiểm tra dữ liệu')
    expect(container.querySelector('[aria-label="Desktop console modules"]')?.textContent).toContain('Hôm nay')
    expect(container.querySelector('[aria-label="Desktop console modules"]')?.textContent).toContain('Mở menu nâng cao')
    expect(container.querySelector('[aria-label="Desktop console modules"]')?.textContent).not.toContain('Email / Resend')
    expect(container.querySelector('[aria-label="Mobile console modules"]')?.textContent).not.toContain('Email / Resend')
    expect(container.textContent).toContain('Kiểm tra dữ liệu content')

    const advancedButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Mở menu nâng cao'))
    expect(advancedButton).toBeTruthy()
    await act(async () => {
      advancedButton?.click()
    })

    expect(container.querySelector('[aria-label="Desktop console modules"]')?.textContent).toContain('Ẩn menu nâng cao')
    expect(container.querySelector('[aria-label="Desktop console modules"]')?.textContent).toContain('Email / Resend')
    expect(container.querySelector('[aria-label="Mobile console modules"]')?.textContent).toContain('Email / Resend')
  })
})
