import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"

export function LoginPage() {
  const navigate = useNavigate()
  const { signInWithPassword } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => email.length > 3 && password.length > 3, [email, password])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await signInWithPassword({ email, password })
      navigate("/", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh w-full grid place-items-center p-4">
      <div className="w-full max-w-sm border bg-card text-card-foreground p-6">
        <div className="mb-6">
          <div className="text-lg font-semibold">1House</div>
          <div className="text-sm text-muted-foreground">Đăng nhập nhân viên</div>
        </div>

        <form className="grid gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1 text-sm">
            <div>Email</div>
            <input
              className="h-9 px-2.5 border bg-background"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label className="grid gap-1 text-sm">
            <div>Mật khẩu</div>
            <input
              className="h-9 px-2.5 border bg-background"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <div className="text-xs text-destructive">{error}</div> : null}

          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>
      </div>
    </div>
  )
}

