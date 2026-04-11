import { Navigate, Outlet } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-dvh w-full grid place-items-center p-6">
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

