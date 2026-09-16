import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'prestige'
type ThemeContextValue = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }

const ThemeContext = createContext<ThemeContextValue | null>(null)
const KEY = 'splitz.theme'

function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'prestige') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme)

  useEffect(() => {
    const root = document.documentElement
    // prestige nền tối → bật CẢ .dark (để các biến thể dark: hoạt động) LẪN .prestige
    // (token vàng ghi đè, đặt sau .dark trong cascade nên thắng).
    root.classList.toggle('dark', theme === 'dark' || theme === 'prestige')
    root.classList.toggle('prestige', theme === 'prestige')
    root.style.colorScheme = theme === 'light' ? 'light' : 'dark'
    localStorage.setItem(KEY, theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta)
      meta.setAttribute(
        'content',
        theme === 'prestige' ? '#08070a' : theme === 'dark' ? '#070b1a' : '#356bff',
      )
  }, [theme])

  const value: ThemeContextValue = {
    theme,
    setTheme: setThemeState,
    toggle: () => setThemeState((t) => (t === 'light' ? 'dark' : 'light')),
  }
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme phải nằm trong ThemeProvider.')
  return ctx
}
