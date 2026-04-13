import { CalendarPlus } from "@phosphor-icons/react";
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

  const pageSubtitle = useMemo(() => {
    const p = location.pathname;
    if (p === "/") return "Theo dõi doanh thu và vận hành";
    if (p.startsWith("/rooms")) return "Check-in, dọn phòng, thu tiền";
    if (p.startsWith("/revenue")) return "Lịch doanh thu theo ngày";
    if (p.startsWith("/bookings")) return "Danh sách đặt phòng";
    if (p.startsWith("/settings")) return "Chi nhánh và phòng";
    return "";
  }, [location.pathname]);

  return (
    <SidebarProvider className="box-border flex h-dvh max-h-dvh overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      <BookingDialog
        open={isBookingOpen}
        onOpenChange={setIsBookingOpen}
        createBooking={createBooking}
      />

      <AppSidebar />

      <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/50 bg-background/80 px-3 shadow-[0_1px_0_0_var(--border)] backdrop-blur-md sm:h-16 sm:px-5">
          <SidebarTrigger
            title="Thu gọn / mở menu"
            aria-label="Thu gọn hoặc mở menu điều hướng"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {pageTitle}
            </div>
            {pageSubtitle ? (
              <div className="hidden truncate text-xs text-muted-foreground sm:block">
                {pageSubtitle}
              </div>
            ) : null}
          </div>
        </header>
        <Button
          type="button"
          variant="default"
          size="default"
          className="fixed z-40 gap-2 rounded-full px-5 shadow-[var(--shadow-warm-lg)] transition-all hover:scale-[1.02] hover:shadow-[var(--shadow-warm-xl)] bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] sm:bottom-6 sm:right-6"
          onClick={() => setIsBookingOpen(true)}
        >
          <CalendarPlus className="size-5 shrink-0" weight="duotone" />
          Đặt phòng
        </Button>
        {/* Cuộn trong khối này thay vì body — tránh nhảy lên đầu trang khi focus/Select trên mobile; chừa chỗ cho nút nổi */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 pb-20 sm:p-6 sm:pb-24 [-webkit-overflow-scrolling:touch] animate-in fade-in duration-300">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
