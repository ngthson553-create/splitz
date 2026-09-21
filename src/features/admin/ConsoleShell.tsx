import clsx from 'clsx'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft, Home, LayoutDashboard, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { Badge } from '../../components/ui'
import { useT } from '../../lib/i18n'
import { useConsoleAccess } from './ConsoleAccessContext'
import { consoleModuleGroups, consoleModules, pathForConsoleModule, type ConsoleModule } from './consoleModules'

const ROLE_LABEL = {
  owner: 'Owner',
  operator: 'Operator',
  support: 'Support',
  readonly: 'Readonly',
}

const BASIC_MODULE_IDS = new Set(['health', 'jobs', 'data-quality', 'audit'])

export function ConsoleShell() {
  const access = useConsoleAccess()
  const t = useT()
  const location = useLocation()
  const [advancedNavOpen, setAdvancedNavOpen] = useState(false)
  const current = consoleModules.find((module) => location.pathname === pathForConsoleModule(module))
  const currentGroupModules = current ? consoleModules.filter((module) => module.group === current.group) : consoleModules.slice(0, 4)
  const basicModules = consoleModules.filter((module) => BASIC_MODULE_IDS.has(module.id))
  const compactModules = current && !basicModules.some((module) => module.id === current.id)
    ? [...basicModules, current]
    : basicModules
  const navModules = advancedNavOpen ? consoleModules : compactModules

  return (
    <div className="relative min-h-dvh text-app">
      <div className="app-aurora" />
      <div className="relative mx-auto w-full max-w-[1500px] px-4 py-4 sm:px-6 lg:py-6">
        <div className="grid gap-4 lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:gap-6">
          <aside className="card h-fit overflow-hidden p-0 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Link
                  to="/"
                  aria-label={t.adminPages.shell.backToApp}
                  className="press grid h-10 w-10 shrink-0 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300"
                >
                  <ArrowLeft size={18} />
                </Link>
                <Link to="/console" className="min-w-0 press">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-faint">Splitz</p>
                  <h1 className="truncate text-lg font-extrabold tracking-tight text-gradient">Console</h1>
                </Link>
              </div>

              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-brand text-white shadow-soft">
                    <ShieldCheck size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-app">{access.email ?? 'Admin'}</p>
                    <p className="text-xs text-muted">{ROLE_LABEL[access.role]}</p>
                  </div>
                </div>
              </div>
            </div>

            <MobileModuleRail modules={navModules} advancedOpen={advancedNavOpen} onAdvancedToggle={() => setAdvancedNavOpen((value) => !value)} />

            <nav className="hidden space-y-5 border-t border-[var(--border)] p-4 lg:block" aria-label="Desktop console modules">
              <NavLink
                to="/console"
                end
                className={({ isActive }) =>
                  clsx(
                    'press flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition',
                    isActive
                      ? 'bg-brand-500/12 text-brand-600 dark:text-brand-300'
                      : 'text-muted hover:bg-[var(--surface-2)] hover:text-app',
                  )
                }
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl surface-sunken text-brand-600 dark:text-brand-300">
                  <Home size={16} />
                </span>
                <span className="min-w-0 flex-1 truncate">{t.adminPages.shell.today}</span>
              </NavLink>

              <button
                type="button"
                onClick={() => setAdvancedNavOpen((value) => !value)}
                aria-pressed={advancedNavOpen}
                className="press flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-left text-sm font-semibold text-muted transition hover:text-app"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl surface-sunken text-brand-600 dark:text-brand-300">
                  <SlidersHorizontal size={16} />
                </span>
                <span className="min-w-0 flex-1 truncate">{advancedNavOpen ? t.adminPages.shell.hideAdvancedMenu : t.adminPages.shell.showAdvancedMenu}</span>
              </button>

              {advancedNavOpen ? (
                consoleModuleGroups.map((group) => (
                  <div key={group} className="space-y-1.5">
                    <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-faint">{t.adminPages.group[group]}</p>
                    {consoleModules
                      .filter((module) => module.group === group)
                      .map((module) => (
                        <ConsoleNavItem key={module.id} module={module} />
                      ))}
                  </div>
                ))
              ) : (
                <div className="space-y-1.5">
                  <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-faint">{t.adminPages.shell.toReview}</p>
                  {navModules.map((module) => <ConsoleNavItem key={module.id} module={module} />)}
                </div>
              )}
            </nav>
          </aside>

          <main className="min-w-0 space-y-4 pb-8">
            <header className="card min-w-0 overflow-hidden p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">Admin only</Badge>
                  <Badge tone="muted">Phase 21</Badge>
                  {current && <Badge tone="muted">{t.adminPages.group[current.group]}</Badge>}
                </div>
                <h2 className="mt-2 truncate text-xl font-extrabold tracking-tight lg:text-2xl">
                  {current?.label ?? t.adminPages.shell.today}
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                  {current?.summary ?? t.adminPages.shell.homeSummary}
                </p>
              </div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto xl:justify-end">
                {currentGroupModules.map((module) => (
                  <NavLink
                    key={module.id}
                    to={pathForConsoleModule(module)}
                    className={({ isActive }) =>
                      clsx(
                        'press grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-muted transition',
                        isActive
                          ? 'border-brand-400/50 bg-brand-500/12 text-brand-600 dark:text-brand-300'
                          : 'border-[var(--border)] bg-[var(--surface-solid)] hover:text-app',
                      )
                    }
                    aria-label={module.label}
                  >
                    <module.icon size={17} />
                  </NavLink>
                ))}
              </div>
              </div>
            </header>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

function MobileModuleRail({ modules, advancedOpen, onAdvancedToggle }: { modules: ConsoleModule[]; advancedOpen: boolean; onAdvancedToggle: () => void }) {
  const t = useT()
  return (
    <nav className="border-t border-[var(--border)] px-4 pb-4 lg:hidden" aria-label="Mobile console modules">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pt-4">
        <NavLink
          to="/console"
          end
          className={({ isActive }) =>
            clsx(
              'press inline-flex min-w-fit shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
              isActive
                ? 'border-brand-400/50 bg-brand-500/12 text-brand-600 dark:text-brand-300'
                : 'border-[var(--border)] bg-[var(--surface-solid)] text-muted hover:text-app',
            )
          }
        >
          <Home size={15} />
          <span>{t.adminPages.shell.today}</span>
        </NavLink>
        <button
          type="button"
          onClick={onAdvancedToggle}
          aria-pressed={advancedOpen}
          className="press inline-flex min-w-fit shrink-0 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 py-2 text-xs font-extrabold text-muted transition hover:text-app"
        >
          <SlidersHorizontal size={15} />
          <span>{advancedOpen ? t.adminPages.shell.hideAdvancedMenu : t.adminPages.shell.showAdvancedMenu}</span>
        </button>
        {modules.map((module) => (
          <NavLink
            key={module.id}
            to={pathForConsoleModule(module)}
            className={({ isActive }) =>
              clsx(
                'press inline-flex min-w-fit shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
                isActive
                  ? 'border-brand-400/50 bg-brand-500/12 text-brand-600 dark:text-brand-300'
                  : 'border-[var(--border)] bg-[var(--surface-solid)] text-muted hover:text-app',
              )
            }
          >
            <module.icon size={15} />
            <span>{module.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function ConsoleNavItem({ module }: { module: ConsoleModule }) {
  return (
    <NavLink
      to={pathForConsoleModule(module)}
      className={({ isActive }) =>
        clsx(
          'press flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition',
          isActive
            ? 'bg-brand-500/12 text-brand-600 dark:text-brand-300'
            : 'text-muted hover:bg-[var(--surface-2)] hover:text-app',
        )
      }
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl surface-sunken text-brand-600 dark:text-brand-300">
        {module.id === 'health' ? <LayoutDashboard size={16} /> : <module.icon size={16} />}
      </span>
      <span className="min-w-0 flex-1 truncate">{module.label}</span>
    </NavLink>
  )
}
