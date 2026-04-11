import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { BookingDialog } from "@/components/booking/BookingDialog";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useBookings } from "@/hooks/useBookings";

export function AppLayout() {
  const location = useLocation();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const { createBooking } = useBookings();

  const pageTitle = useMemo(() => {
    const p = location.pathname;
    if (p === "/") return "Tổng quan";
    if (p.startsWith("/rooms")) return "Phòng";
    if (p.startsWith("/revenue")) return "Doanh thu";
    if (p.startsWith("/bookings")) return "Đặt phòng";
    if (p.startsWith("/settings")) return "Cài đặt";
    return "1House";
  }, [location.pathname]);

  return (
    <SidebarProvider className="box-border flex h-dvh max-h-dvh overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      <BookingDialog
        open={isBookingOpen}
        onOpenChange={setIsBookingOpen}
        createBooking={createBooking}
      />

      <AppSidebar />

      <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b px-3 sm:h-14 sm:px-4">
          <SidebarTrigger
            title="Thu gọn / mở menu"
            aria-label="Thu gọn hoặc mở menu điều hướng"
          />
          <div className="min-w-0 truncate text-sm font-medium">{pageTitle}</div>
        </header>
        <Button
          type="button"
          variant="default"
          size="default"
          className="fixed z-40 shadow-md bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] sm:bottom-6 sm:right-6"
          onClick={() => setIsBookingOpen(true)}
        >
          Đặt phòng
        </Button>
        {/* Cuộn trong khối này thay vì body — tránh nhảy lên đầu trang khi focus/Select trên mobile; chừa chỗ cho nút nổi */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-2 pb-16 sm:p-3 sm:pb-20 [-webkit-overflow-scrolling:touch]">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
