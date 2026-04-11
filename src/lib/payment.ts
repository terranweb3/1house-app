import type { PaymentStatus } from "@/lib/types"

export function paymentBadge(p: PaymentStatus) {
  if (p === "paid") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (p === "partial") return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  return "border-destructive/30 bg-destructive/10 text-destructive"
}

export function paymentLabel(p: PaymentStatus) {
  if (p === "paid") return "Đã thu"
  if (p === "partial") return "Thu một phần"
  return "Chưa thu"
}