import * as React from "react"

import { List, X } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type SidebarContextValue = {
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [openMobile, setOpenMobile] = React.useState(false)
  return <SidebarContext.Provider value={{ openMobile, setOpenMobile }}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider")
  return ctx
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { setOpenMobile } = useSidebar()
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={() => setOpenMobile(true)}
      aria-label="Mở menu"
      title="Menu"
    >
      <List size={16} />
    </Button>
  )
}

export function Sidebar({
  className,
  children,
  desktopClassName,
}: {
  className?: string
  desktopClassName?: string
  children: React.ReactNode
}) {
  const { openMobile, setOpenMobile } = useSidebar()

  return (
    <>
      {/* Desktop */}
      <aside className={cn("hidden md:flex w-56 h-dvh sticky top-0", desktopClassName)}>
        <div className={cn("w-full border-r bg-sidebar text-sidebar-foreground flex flex-col min-h-0", className)}>
          {children}
        </div>
      </aside>

      {/* Mobile */}
      {openMobile ? (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Đóng menu"
            onClick={() => setOpenMobile(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[18rem] max-w-[85vw] border-r shadow-lg bg-sidebar text-sidebar-foreground flex flex-col">
            <div className={cn("flex-1 min-h-0", className)}>{children}</div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function SidebarClose({ className }: { className?: string }) {
  const { setOpenMobile } = useSidebar()
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={() => setOpenMobile(false)}
      aria-label="Đóng menu"
      title="Đóng"
    >
      <X size={16} />
    </Button>
  )
}

export function SidebarHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("h-14 px-4 border-b grid items-center", className)}>{children}</div>
}

export function SidebarContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-2 flex-1 min-h-0 overflow-auto", className)}>{children}</div>
}

export function SidebarFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-2 border-t mt-auto grid gap-2", className)}>{children}</div>
}

