import { Navigate, Route, Routes } from "react-router-dom"

import { AppLayout } from "@/components/layout/AppLayout"
import { ProtectedRoute } from "@/components/layout/ProtectedRoute"
import { LoginPage } from "@/pages/LoginPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { RatesPage } from "@/pages/RatesPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { RoomsPage } from "@/pages/RoomsPage"
import { useAuth } from "@/hooks/useAuth"

function App() {
  const { isLoading, user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/revenue" element={<RatesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          isLoading ? (
            <div className="min-h-dvh grid place-items-center">Đang tải...</div>
          ) : (
            <Navigate to={user ? "/" : "/login"} replace />
          )
        }
      />
    </Routes>
  )
}

export default App
