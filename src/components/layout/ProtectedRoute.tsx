import { Navigate, Outlet } from "react-router-dom"

import { useAuth } from "@/hooks/useAuth"

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-dvh w-full grid place-items-center">
        <div className="text-sm text-muted-foreground">Đang tải...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

