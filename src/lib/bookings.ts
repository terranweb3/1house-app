import { supabase } from "@/lib/supabase"
import { upsertMetasBatch } from "@/lib/roomDayMeta"
import { upsertRatesBatch } from "@/lib/rates"
import type { Booking, BookingItem, BookingWithItems, PaymentStatus, RoomDayMeta, UUID } from "@/lib/types"

export type CreateBookingInput = {
  guestName: string
  guestPhone: string | null
  paymentStatus: PaymentStatus
  note: string | null
  items: Array<{
    branchId: UUID
    roomId: UUID
    date: string
    price: number
  }>
}

export type UpdateBookingInput = {
  guestName?: string
  guestPhone?: string | null
  paymentStatus?: PaymentStatus
  note?: string | null
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      guest_name: input.guestName,
      guest_phone: input.guestPhone,
      payment_status: input.paymentStatus,
      note: input.note,
    })
    .select()
    .single()

  if (bookingError) throw bookingError

  const items = input.items.map((item) => ({
    booking_id: booking.id,
    branch_id: item.branchId,
    room_id: item.roomId,
    date: item.date,
    price: item.price,
  }))

  const { error: itemsError } = await supabase.from("booking_items").insert(items)
  if (itemsError) throw itemsError

  const rateRows = input.items.map((item) => ({
    branchId: item.branchId,
    roomId: item.roomId,
    date: item.date,
    price: item.price,
  }))
  await upsertRatesBatch(rateRows)

  const metaRows = input.items.map((item) => ({
    branchId: item.branchId,
    roomId: item.roomId,
    date: item.date,
    guestName: input.guestName,
    guestPhone: input.guestPhone,
    paymentStatus: input.paymentStatus,
    note: input.note,
    cleaned: false,
    checkedOut: false,
    checkedInAt: null as string | null,
    checkedOutAt: null as string | null,
  }))
  await upsertMetasBatch(metaRows)

  return booking
}

export async function getBookings(): Promise<BookingWithItems[]> {
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false })

  if (bookingsError) throw bookingsError
  if (!bookings) return []

  const { data: items, error: itemsError } = await supabase
    .from("booking_items")
    .select("*")
    .in("booking_id", bookings.map((b) => b.id))

  if (itemsError) throw itemsError

  const branchIds = [...new Set(items?.map((i) => i.branch_id) ?? [])]

  const { data: branches } = branchIds.length
    ? await supabase.from("branches").select("id, name").in("id", branchIds)
    : { data: [] }

  const branchMap = new Map(branches?.map((b) => [b.id, b.name]) ?? [])

  return bookings.map((booking) => {
    const bookingItems = items?.filter((i) => i.booking_id === booking.id) ?? []
    const branchNames = [...new Set(bookingItems.map((i) => branchMap.get(i.branch_id)).filter(Boolean))] as string[]

    return {
      ...booking,
      items: bookingItems,
      branch_names: branchNames,
    }
  })
}

async function getBookingItems(bookingId: UUID): Promise<BookingItem[]> {
  const { data, error } = await supabase
    .from("booking_items")
    .select("*")
    .eq("booking_id", bookingId)
    .order("date", { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function updateBooking(id: UUID, input: UpdateBookingInput): Promise<Booking> {
  const { data: current, error: currentError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single()

  if (currentError) throw currentError

  const updates: Record<string, unknown> = {}
  if (input.guestName !== undefined) updates.guest_name = input.guestName
  if (input.guestPhone !== undefined) updates.guest_phone = input.guestPhone
  if (input.paymentStatus !== undefined) updates.payment_status = input.paymentStatus
  if (input.note !== undefined) updates.note = input.note

  const { data, error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error

  const guestName = input.guestName ?? current.guest_name
  const guestPhone = input.guestPhone !== undefined ? input.guestPhone : current.guest_phone
  const paymentStatus = input.paymentStatus ?? current.payment_status
  const note = input.note !== undefined ? input.note : current.note

  const items = await getBookingItems(id)
  const roomIds = [...new Set(items.map((i) => i.room_id))]
  const dates = [...new Set(items.map((i) => i.date))]
  const { data: existingMetas } = await supabase
    .from("room_day_meta")
    .select("*")
    .in("room_id", roomIds)
    .in("date", dates)

  const existingByKey = new Map<string, RoomDayMeta>()
  for (const row of (existingMetas ?? []) as RoomDayMeta[]) {
    existingByKey.set(`${row.room_id}:${row.date}`, row)
  }

  const metaRows = items.map((item) => {
    const ex = existingByKey.get(`${item.room_id}:${item.date}`)
    return {
      branchId: item.branch_id,
      roomId: item.room_id,
      date: item.date,
      guestName,
      guestPhone,
      paymentStatus,
      note,
      cleaned: ex?.cleaned ?? false,
      checkedOut: ex?.checked_out ?? false,
      checkedInAt: ex?.checked_in_at ?? null,
      checkedOutAt: ex?.checked_out_at ?? null,
    }
  })
  if (metaRows.length > 0) {
    await upsertMetasBatch(metaRows)
  }

  return data
}

export async function deleteBooking(id: UUID): Promise<void> {
  const { error } = await supabase.from("bookings").delete().eq("id", id)
  if (error) throw error
}

/** Phòng có ít nhất một dòng `booking_items` cho ngày (lọc chi nhánh nếu khác `"all"`). */
export async function getRoomIdsBookedOnDate(args: {
  date: string
  branchId: UUID | "all"
}): Promise<Set<string>> {
  let q = supabase.from("booking_items").select("room_id").eq("date", args.date)
  if (args.branchId !== "all") q = q.eq("branch_id", args.branchId)
  const { data, error } = await q
  if (error) throw error
  return new Set((data ?? []).map((row: { room_id: string }) => row.room_id))
}
