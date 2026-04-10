import { House, Tag, GearSix, Moon, Sun } from "@phosphor-icons/react"
import { NavLink } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "@/contexts/ThemeContext"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", label: "Tổng quan", icon: House },
  { to: "/revenue", label: "Doanh thu", icon: Tag },
  { to: "/settings", label: "Cài đặt", icon: GearSix },
] as const

export function Sidebar({
  className,
  onNavigate,
  showBrand = true,
}: {
  className?: string
  onNavigate?: () => void
  showBrand?: boolean
}) {
  const { signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className={cn("border-r bg-sidebar text-sidebar-foreground flex flex-col min-h-0", className)}>
      {showBrand ? (
        <div className="h-14 px-4 border-b grid items-center">
          <div className="font-semibold">1House</div>
        </div>
      ) : null}
      <nav className="p-2 grid gap-1 flex-1 content-start">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => onNavigate?.()}
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

      <div className="p-2 border-t mt-auto grid gap-2">
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
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => {
            onNavigate?.()
            void signOut()
          }}
        >
          Đăng xuất
        </Button>
      </div>
    </aside>
  )
}
