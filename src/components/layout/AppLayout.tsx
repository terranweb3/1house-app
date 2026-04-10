import { useMemo, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"

import { AppSidebar } from "@/components/layout/AppSidebar"
import { QuickAddDialog } from "@/components/revenue/QuickAddDialog"
import { QuickAddFab } from "@/components/revenue/QuickAddFab"
import { Button } from "@/components/ui/button"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/useAuth"

export function AppLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)

  const pageTitle = useMemo(() => {
    const p = location.pathname
    if (p === "/") return "Tổng quan"
    if (p.startsWith("/revenue")) return "Doanh thu"
    if (p.startsWith("/settings")) return "Cài đặt"
    return "1House"
  }, [location.pathname])

  return (
    <SidebarProvider>
      <div className="min-h-dvh w-full overflow-x-hidden md:grid md:grid-cols-[14rem_1fr]">
        <QuickAddDialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen} />
        <QuickAddFab onClick={() => setIsQuickAddOpen(true)} />

        <AppSidebar />

        <div className="min-w-0">
          <header className="h-14 border-b px-3 sm:px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="md:hidden" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{pageTitle}</div>
                <div className="text-xs text-muted-foreground truncate hidden sm:block">
                  {user?.email ? <>Đăng nhập: {user.email}</> : null}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsQuickAddOpen(true)}>
                Nhập nhanh
              </Button>
            </div>
          </header>
          <main className="p-3 sm:p-4 min-w-0 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

