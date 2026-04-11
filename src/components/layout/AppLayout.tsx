import { useMemo, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"

import { AppSidebar } from "@/components/layout/AppSidebar"
import { BookingDialog } from "@/components/booking/BookingDialog"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { useBookings } from "@/hooks/useBookings"

export function AppLayout() {
  const location = useLocation()
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const { createBooking } = useBookings()

  const pageTitle = useMemo(() => {
    const p = location.pathname
    if (p === "/") return "Tổng quan"
    if (p.startsWith("/rooms")) return "Phòng"
    if (p.startsWith("/revenue")) return "Doanh thu"
    if (p.startsWith("/bookings")) return "Đặt phòng"
    if (p.startsWith("/settings")) return "Cài đặt"
    return "1House"
  }, [location.pathname])

  return (
    <SidebarProvider>
      <BookingDialog open={isBookingOpen} onOpenChange={setIsBookingOpen} createBooking={createBooking} />

      <AppSidebar />

      <SidebarInset className="min-h-svh min-w-0 overflow-x-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger title="Thu gọn / mở menu" aria-label="Thu gọn hoặc mở menu điều hướng" />
            <div className="min-w-0 truncate text-sm font-medium">{pageTitle}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsBookingOpen(true)}>
              Đặt phòng
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
