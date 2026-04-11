import { addDays, eachDayOfInterval, format, parseISO } from "date-fns"

import type { CreateBookingInput } from "@/lib/bookings"
import type { BookingItem, UUID } from "@/lib/types"

/** Giới hạn số đêm tối đa trên một dòng form (khoảng ngày inclusive). */
export const MAX_NIGHTS_PER_LINE = 62

export type BookingLineForCreate = {
  branchId: UUID
  roomId: UUID
  fromDate: string
  toDate: string
  pricePerNight: number
}

/** Bung mỗi dòng (phòng × khoảng ngày × giá/đêm) thành các dòng DB per-day. */
export function expandLinesToCreateItems(lines: BookingLineForCreate[]): CreateBookingInput["items"] {
  const out: CreateBookingInput["items"] = []
  for (const line of lines) {
    const start = parseISO(line.fromDate)
    const end = parseISO(line.toDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue
    if (start > end) continue
    const days = eachDayOfInterval({ start, end })
    for (const d of days) {
      out.push({
        branchId: line.branchId,
        roomId: line.roomId,
        date: format(d, "yyyy-MM-dd"),
        price: line.pricePerNight,
      })
    }
  }
  return out
}

export type GroupedBookingLine = {
  id: string
  branchId: UUID
  roomId: UUID
  fromDate: string
  toDate: string
  pricePerNight: string
}

/**
 * Gom các booking_items (per-day) thành các dòng khoảng ngày liên tiếp,
 * theo nhóm (branch_id, room_id, price).
 */
export function groupBookingItemsToLines(items: BookingItem[], newId: () => string): GroupedBookingLine[] {
  const byKey = new Map<string, BookingItem[]>()
  for (const it of items) {
    const k = `${it.branch_id}|${it.room_id}|${it.price}`
    const arr = byKey.get(k) ?? []
    arr.push(it)
    byKey.set(k, arr)
  }

  const lines: GroupedBookingLine[] = []

  for (const arr of byKey.values()) {
    const dates = [...new Set(arr.map((x) => x.date))].sort()
    let i = 0
    while (i < dates.length) {
      const runStart = dates[i]!
      let runEnd = runStart
      let j = i + 1
      while (j < dates.length) {
        const expected = format(addDays(parseISO(runEnd), 1), "yyyy-MM-dd")
        if (dates[j] === expected) {
          runEnd = dates[j]!
          j++
        } else {
          break
        }
      }
      const first = arr[0]!
      lines.push({
        id: newId(),
        branchId: first.branch_id,
        roomId: first.room_id,
        fromDate: runStart,
        toDate: runEnd,
        pricePerNight: String(first.price),
      })
      i = j
    }
  }

  lines.sort((a, b) => {
    if (a.branchId !== b.branchId) return a.branchId.localeCompare(b.branchId)
    if (a.roomId !== b.roomId) return a.roomId.localeCompare(b.roomId)
    return a.fromDate.localeCompare(b.fromDate)
  })

  return lines
}

/** Số đêm (inclusive) trong khoảng from–to; 0 nếu không hợp lệ. */
export function countNightsInclusive(fromIso: string, toIso: string): number {
  try {
    const start = parseISO(fromIso)
    const end = parseISO(toIso)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
    if (start > end) return 0
    return eachDayOfInterval({ start, end }).length
  } catch {
    return 0
  }
}
