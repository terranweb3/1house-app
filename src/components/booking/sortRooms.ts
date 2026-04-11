import type { Room } from "@/lib/types"

/** Sắp xếp theo số phòng (hỗ trợ số trong chuỗi, ví dụ 2 trước 10). */
export function sortRooms(rooms: Room[]): Room[] {
  return [...rooms].sort((a, b) =>
    a.room_number.localeCompare(b.room_number, "vi", { numeric: true, sensitivity: "base" })
  )
}
