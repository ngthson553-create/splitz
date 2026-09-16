import { Component, type ErrorInfo, type ReactNode } from 'react'
import { captureError } from '../lib/analytics'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error)
    // eslint-disable-next-line no-console
    console.error('Splitz crash:', error, info)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh grid place-items-center px-6 text-center">
          <div className="space-y-4 max-w-xs">
            <div className="grid place-items-center h-16 w-16 mx-auto rounded-2xl bg-neg/12 text-neg text-3xl">
              ⚠️
            </div>
            <div>
              <h1 className="font-bold text-app">Có lỗi xảy ra</h1>
              <p className="mt-1.5 text-sm text-muted">
                Splitz gặp sự cố không mong muốn. Dữ liệu của bạn vẫn an toàn trên máy.
              </p>
            </div>
            <button
              onClick={() => {
                this.reset()
                window.location.assign('/')
              }}
              className="press gradient-brand text-white font-semibold rounded-2xl h-11 px-5 shadow-glow"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
