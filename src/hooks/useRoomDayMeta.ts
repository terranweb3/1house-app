import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import type { RoomDayMeta, UUID } from "@/lib/types"
import { supabase } from "@/lib/supabase"

type MetaUpsertInput = {
  branchId: UUID
  roomId: UUID
  date: string
  guestName: string | null
  guestPhone: string | null
  paymentStatus: "unpaid" | "paid" | "partial"
  note: string | null
  cleaned: boolean
  checkedOut: boolean
  checkedInAt: string | null
  checkedOutAt: string | null
}

function buildOptimisticRow(existing: RoomDayMeta | undefined, input: MetaUpsertInput): RoomDayMeta {
  const now = new Date().toISOString()
  return {
    id: existing?.id ?? crypto.randomUUID(),
    branch_id: input.branchId,
    room_id: input.roomId,
    date: input.date,
    guest_name: input.guestName,
    guest_phone: input.guestPhone,
    payment_status: input.paymentStatus,
    note: input.note,
    cleaned: input.cleaned,
    checked_out: input.checkedOut,
    checked_in_at: input.checkedInAt,
    checked_out_at: input.checkedOutAt,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  }
}

function applyUpsertOptimistic(prev: RoomDayMeta[], input: MetaUpsertInput): RoomDayMeta[] {
  const idx = prev.findIndex((m) => m.room_id === input.roomId && m.date === input.date)
  const row = buildOptimisticRow(idx >= 0 ? prev[idx] : undefined, input)
  if (idx >= 0) {
    const next = [...prev]
    next[idx] = row
    return next
  }
  return [...prev, row]
}

export function useRoomDayMeta(args: { branchId: UUID | "all"; from: string; to: string; enabled?: boolean }) {
  const enabled = args.enabled !== false
  const [metas, setMetas] = useState<RoomDayMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const key = useMemo(() => `${args.branchId}:${args.from}:${args.to}`, [args.branchId, args.from, args.to])

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    if (!enabled) {
      setMetas([])
      setIsLoading(false)
      setError(null)
      return
    }
    if (!silent) setIsLoading(true)
    setError(null)
    try {
      let q = supabase
        .from("room_day_meta")
        .select("*")
        .gte("date", args.from)
        .lte("date", args.to)
        .order("date", { ascending: true })

      if (args.branchId !== "all") q = q.eq("branch_id", args.branchId)

      const { data, error } = await q
      if (error) throw error
      setMetas((data ?? []) as RoomDayMeta[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Tải thông tin khách thất bại")
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [args.branchId, args.from, args.to, enabled])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])

  const upsertMeta = useCallback(async (input: MetaUpsertInput) => {
    let snapshot: RoomDayMeta[] = []
    setMetas((prev) => {
      snapshot = prev
      return applyUpsertOptimistic(prev, input)
    })

    const { error: upsertError } = await supabase.from("room_day_meta").upsert(
      {
        branch_id: input.branchId,
        room_id: input.roomId,
        date: input.date,
        guest_name: input.guestName,
        guest_phone: input.guestPhone,
        payment_status: input.paymentStatus,
        note: input.note,
        cleaned: input.cleaned,
        checked_out: input.checkedOut,
        checked_in_at: input.checkedInAt,
        checked_out_at: input.checkedOutAt,
      },
      { onConflict: "room_id,date" }
    )

    if (upsertError) {
      setMetas(snapshot)
      const msg = upsertError.message || "Không lưu được thông tin phòng"
      toast.error(msg)
      throw upsertError
    }
  }, [])

  const deleteMeta = useCallback(async (input: { roomId: UUID; date: string }) => {
    let snapshot: RoomDayMeta[] = []
    setMetas((prev) => {
      snapshot = prev
      return prev.filter((m) => !(m.room_id === input.roomId && m.date === input.date))
    })

    const { error: deleteError } = await supabase
      .from("room_day_meta")
      .delete()
      .eq("room_id", input.roomId)
      .eq("date", input.date)

    if (deleteError) {
      setMetas(snapshot)
      const msg = deleteError.message || "Không xóa được thông tin phòng"
      toast.error(msg)
      throw deleteError
    }
  }, [])

  return { metas, isLoading, error, refresh, upsertMeta, deleteMeta }
}
