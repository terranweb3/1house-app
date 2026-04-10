import { GearSix, House, Moon, Sun, Tag } from "@phosphor-icons/react"
import { NavLink } from "react-router-dom"

import { Sidebar, SidebarClose, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "@/contexts/ThemeContext"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", label: "Tổng quan", icon: House },
  { to: "/revenue", label: "Doanh thu", icon: Tag },
  { to: "/settings", label: "Cài đặt", icon: GearSix },
] as const

export function AppSidebar({ className }: { className?: string }) {
  const { signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <Sidebar className={cn("bg-sidebar text-sidebar-foreground flex flex-col min-h-0", className)}>
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold">1House</div>
          <SidebarClose className="md:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <nav className="grid gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "h-9 px-2.5 inline-flex items-center gap-2 border border-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border"
                )
              }
              end={to === "/"}
            >
              <Icon size={16} />
              <span className="text-sm">{label}</span>
            </NavLink>
          ))}
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => toggleTheme()}
          aria-label="Chuyển đổi giao diện sáng/tối"
          title="Dark mode"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={() => void signOut()}>
          Đăng xuất
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}

