import {
  CalendarCheck,
  Door,
  GearSix,
  House,
  Moon,
  Power,
  Sun,
  Tag,
  X,
} from "@phosphor-icons/react";
import { matchPath, NavLink, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { to: "/", label: "Tổng quan", icon: House },
  { to: "/rooms", label: "Phòng", icon: Door },
  { to: "/revenue", label: "Doanh thu", icon: Tag },
  { to: "/bookings", label: "Đặt phòng", icon: CalendarCheck },
  { to: "/settings", label: "Cài đặt", icon: GearSix },
] as const;

function navActive(to: string, pathname: string) {
  return matchPath({ path: to, end: to === "/" }, pathname) != null;
}

export function AppSidebar() {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isMobile, setOpenMobile } = useSidebar();

  const email = user?.email ?? "";
  const shortEmail = email.length > 28 ? `${email.slice(0, 25)}…` : email;

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border/60 px-3 pb-3 pt-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-[var(--shadow-warm-sm)]">
              <House className="size-5" weight="duotone" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold tracking-tight text-sidebar-foreground">
                1House
              </div>
              <div className="truncate text-[11px] text-sidebar-foreground/60">
                Quản lý khách sạn
              </div>
            </div>
          </div>
          {isMobile ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-lg"
              onClick={() => setOpenMobile(false)}
              aria-label="Đóng menu"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarMenu className="gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <SidebarMenuItem key={to}>
              <SidebarMenuButton
                isActive={navActive(to, pathname)}
                render={
                  <NavLink
                    to={to}
                    end={to === "/"}
                    onClick={() => {
                      if (isMobile) setOpenMobile(false);
                    }}
                  />
                }
              >
                <Icon className="size-4" weight={navActive(to, pathname) ? "fill" : "regular"} />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t border-sidebar-border/60 p-2">
        {shortEmail ? (
          <div className="rounded-lg bg-sidebar-accent/50 px-2.5 py-2">
            <div className="text-[10px] font-medium uppercase tracking-wide text-sidebar-foreground/50">
              Đăng nhập
            </div>
            <div
              className="truncate text-xs text-sidebar-foreground/85"
              title={email}
            >
              {shortEmail}
            </div>
          </div>
        ) : null}
        <Separator className="bg-sidebar-border/60" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => toggleTheme()}
              aria-label="Chuyển đổi giao diện sáng/tối"
              title="Dark mode"
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
              <span>{theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => void signOut()}>
              <Power className="size-4" />
              <span>Đăng xuất</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
