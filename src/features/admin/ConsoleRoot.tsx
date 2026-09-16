import { Navigate, Route, Routes } from 'react-router-dom'
import { ConsoleAccessGate } from './ConsoleGate'
import { ConsoleShell } from './ConsoleShell'
import { ConsoleHomePage, ConsoleModulePage } from './ConsolePages'
import { consoleModules } from './consoleModules'

export function ConsoleRoot() {
  return (
    <ConsoleAccessGate>
      <Routes>
        <Route element={<ConsoleShell />}>
          <Route index element={<ConsoleHomePage />} />
          {consoleModules.map((module) => (
            <Route key={module.id} path={module.slug} element={<ConsoleModulePage module={module} />} />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/console" replace />} />
      </Routes>
    </ConsoleAccessGate>
  )
}
