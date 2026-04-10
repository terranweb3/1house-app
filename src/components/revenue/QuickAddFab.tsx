import { Plus } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"

export function QuickAddFab({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="md:hidden fixed right-4 z-60"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <Button
        type="button"
        onClick={onClick}
        className="h-12 w-12 rounded-full shadow-lg"
        aria-label="Nhập doanh thu nhanh"
        title="Nhập nhanh"
      >
        <Plus size={18} />
      </Button>
    </div>
  )
}

