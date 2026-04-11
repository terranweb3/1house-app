import { useMemo, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"

import { AppSidebar } from "@/components/layout/AppSidebar"
import { QuickAddDialog } from "@/components/revenue/QuickAddDialog"
import { QuickAddFab } from "@/components/revenue/QuickAddFab"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export function AppLayout() {
  const location = useLocation()
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)

  const pageTitle = useMemo(() => {
    const p = location.pathname
    if (p === "/") return "Tổng quan"
    if (p.startsWith("/rooms")) return "Phòng"
    if (p.startsWith("/revenue")) return "Doanh thu"
    if (p.startsWith("/settings")) return "Cài đặt"
    return "1House"
  }, [location.pathname])

  return (
    <SidebarProvider>
      <QuickAddDialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen} />
      <QuickAddFab onClick={() => setIsQuickAddOpen(true)} />

      <AppSidebar />

      <SidebarInset className="min-h-svh min-w-0 overflow-x-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger title="Thu gọn / mở menu" aria-label="Thu gọn hoặc mở menu điều hướng" />
            <div className="min-w-0 truncate text-sm font-medium">{pageTitle}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsQuickAddOpen(true)}>
              Nhập nhanh
            </Button>
          </div>
        </header>
        <div className="min-w-0 flex-1 overflow-x-hidden p-2 sm:p-3">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

