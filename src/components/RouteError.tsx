import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'

/** Trang lỗi route thân thiện thay cho 404 thô của React Router. */
export function RouteError() {
  const error = useRouteError()
  const navigate = useNavigate()
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
            {is404 ? 'Không tìm thấy trang' : 'Có lỗi xảy ra'}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {is404
              ? 'Đường dẫn không tồn tại hoặc đã thay đổi.'
              : 'Splitz gặp sự cố không mong muốn. Dữ liệu của bạn vẫn an toàn.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="press gradient-brand text-white font-semibold rounded-2xl h-11 px-5 shadow-glow"
        >
          Về trang chủ
        </button>
      </div>
    </div>
  )
}
