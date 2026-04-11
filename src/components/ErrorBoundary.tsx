import type { ReactNode } from "react"
import { Component } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

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
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Có lỗi xảy ra</CardTitle>
              <CardDescription>
                Vui lòng tải lại trang. Nếu lỗi tiếp tục, hãy đăng xuất rồi đăng nhập lại.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-end">
              <Button type="button" variant="outline" onClick={() => window.location.reload()}>
                Tải lại
              </Button>
            </CardFooter>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
