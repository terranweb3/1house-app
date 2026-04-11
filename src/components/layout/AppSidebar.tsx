import { CalendarCheck, Door, GearSix, House, Moon, Sun, Tag, X } from "@phosphor-icons/react"
import { matchPath, NavLink, useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
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
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "@/contexts/ThemeContext"

const navItems = [
  { to: "/", label: "Tổng quan", icon: House },
  { to: "/rooms", label: "Phòng", icon: Door },
  { to: "/revenue", label: "Doanh thu", icon: Tag },
  { to: "/bookings", label: "Đặt phòng", icon: CalendarCheck },
  { to: "/settings", label: "Cài đặt", icon: GearSix },
] as const

function navActive(to: string, pathname: string) {
  return matchPath({ path: to, end: to === "/" }, pathname) != null
}

export function AppSidebar() {
  const { pathname } = useLocation()
  const { signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold">1House</div>
          {isMobile ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpenMobile(false)}
              aria-label="Đóng menu"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navItems.map(({ to, label, icon: Icon }) => (
            <SidebarMenuItem key={to}>
              <SidebarMenuButton
                isActive={navActive(to, pathname)}
                render={
                  <NavLink
                    to={to}
                    end={to === "/"}
                    onClick={() => {
                      if (isMobile) setOpenMobile(false)
                    }}
                  />
                }
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => toggleTheme()}
              aria-label="Chuyển đổi giao diện sáng/tối"
              title="Dark mode"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => void signOut()}>Đăng xuất</SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
