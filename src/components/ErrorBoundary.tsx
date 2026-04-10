import type { ReactNode } from "react"
import { Component } from "react"

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh grid place-items-center p-6">
          <div className="max-w-md w-full border bg-card p-4 grid gap-2">
            <div className="text-base font-semibold">Có lỗi xảy ra</div>
            <div className="text-sm text-muted-foreground">
              Vui lòng tải lại trang. Nếu lỗi tiếp tục, hãy đăng xuất rồi đăng nhập lại.
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="h-9 px-3 border bg-background hover:bg-muted/30 text-sm"
                onClick={() => window.location.reload()}
              >
                Tải lại
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

