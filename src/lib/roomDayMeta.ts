import { supabase } from "@/lib/supabase"
import type { PaymentStatus, UUID } from "@/lib/types"

export type MetaUpsertRow = {
  branchId: UUID
  roomId: UUID
  date: string
  guestName: string | null
  guestPhone: string | null
  paymentStatus: PaymentStatus
  note: string | null
  cleaned: boolean
  checkedOut: boolean
  checkedInAt: string | null
  checkedOutAt: string | null
}

export async function upsertMetasBatch(rows: MetaUpsertRow[]) {
  if (rows.length === 0) return
  const payload = rows.map((r) => ({
    branch_id: r.branchId,
    room_id: r.roomId,
    date: r.date,
    guest_name: r.guestName,
    guest_phone: r.guestPhone,
    payment_status: r.paymentStatus,
    note: r.note,
    cleaned: r.cleaned,
    checked_out: r.checkedOut,
    checked_in_at: r.checkedInAt,
    checked_out_at: r.checkedOutAt,
  }))
  const chunkSize = 500
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize)
    const { error } = await supabase.from("room_day_meta").upsert(chunk, { onConflict: "room_id,date" })
    if (error) throw error
  }
}
