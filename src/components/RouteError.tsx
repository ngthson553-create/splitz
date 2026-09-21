import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { useT } from '../lib/i18n'

/** Trang lỗi route thân thiện thay cho 404 thô của React Router. */
export function RouteError() {
  const error = useRouteError()
  const navigate = useNavigate()
  const t = useT()
  const is404 = isRouteErrorResponse(error) && error.status === 404

  return (
    <div className="relative min-h-dvh grid place-items-center px-6 text-center">
      <div className="app-aurora" />
      <div className="relative space-y-4 max-w-xs">
        <div className="grid place-items-center h-16 w-16 mx-auto rounded-2xl bg-neg/12 text-neg text-3xl">
          {is404 ? '🧭' : '⚠️'}
        </div>
        <div>
          <h1 className="font-bold text-app">
            {is404 ? t.common.notFound : t.common.somethingWentWrong}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {is404
              ? t.common.routeNotFoundBody
              : t.common.crashMessage}
          </p>
        </div>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="press gradient-brand text-white font-semibold rounded-2xl h-11 px-5 shadow-glow"
        >
          {t.common.backHome}
        </button>
      </div>
    </div>
  )
}
