export type UUID = string

export type Branch = {
  id: UUID
  name: string
  address: string | null
  created_at: string
}

export type RoomStatus = "available" | "occupied" | "maintenance"
export type Room = {
  id: UUID
  branch_id: UUID
  room_number: string
  room_type: string
  status: RoomStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type Rate = {
  id: UUID
  branch_id: UUID
  room_id: UUID
  date: string // YYYY-MM-DD
  price: number
  created_at: string
  updated_at: string
}

export type PaymentStatus = "unpaid" | "paid" | "partial"

export type RoomDayMeta = {
  id: UUID
  branch_id: UUID
  room_id: UUID
  date: string // YYYY-MM-DD
  guest_name: string | null
  guest_phone: string | null
  payment_status: PaymentStatus
  note: string | null
  created_at: string
  updated_at: string
}
