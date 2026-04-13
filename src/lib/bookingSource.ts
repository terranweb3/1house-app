import type { BookingSource } from "@/lib/types"

export const BOOKING_SOURCE_OPTIONS: { value: BookingSource; label: string }[] = [
  { value: "booking_com", label: "Booking.com" },
  { value: "zalo", label: "Zalo" },
  { value: "facebook", label: "Facebook" },
  { value: "other", label: "Khác" },
]

export function isBookingSource(v: string): v is BookingSource {
  return v === "booking_com" || v === "zalo" || v === "facebook" || v === "other"
}

/** Hiển thị một dòng: preset hoặc text “Khác”. */
export function formatBookingSourceLabel(
  source: string | null | undefined,
  other: string | null | undefined,
): string {
  const s = isBookingSource(source ?? "") ? source! : "other"
  if (s === "other") {
    const t = (other ?? "").trim()
    return t || "Khác"
  }
  return BOOKING_SOURCE_OPTIONS.find((o) => o.value === s)?.label ?? s
}
