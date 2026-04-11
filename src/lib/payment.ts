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

/** Nhãn hiển thị kèm số tiền đã thu nếu có (đặt phòng / meta). */
export function paymentLabelWithPartial(
  p: PaymentStatus,
  partialAmountVnd: number | null | undefined,
) {
  if (
    p === "partial" &&
    partialAmountVnd != null &&
    Number.isFinite(Number(partialAmountVnd)) &&
    Number(partialAmountVnd) > 0
  ) {
    return `Thu một phần · ${Number(partialAmountVnd).toLocaleString("vi-VN")} đ`
  }
  return paymentLabel(p)
}