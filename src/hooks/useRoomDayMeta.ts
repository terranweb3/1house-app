import { useCallback, useEffect, useMemo, useState } from "react"

import type { RoomDayMeta, UUID } from "@/lib/types"
import { supabase } from "@/lib/supabase"

export function useRoomDayMeta(args: { branchId: UUID | "all"; from: string; to: string; enabled?: boolean }) {
  const enabled = args.enabled !== false
  const [metas, setMetas] = useState<RoomDayMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const key = useMemo(() => `${args.branchId}:${args.from}:${args.to}`, [args.branchId, args.from, args.to])

  const refresh = useCallback(async () => {
    if (!enabled) {
      setMetas([])
      setIsLoading(false)
      setError(null)
      return
    }
    setIsLoading(true)
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
      setIsLoading(false)
    }
  }, [args.branchId, args.from, args.to, enabled])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])

  const upsertMeta = useCallback(
    async (input: {
      branchId: UUID
      roomId: UUID
      date: string
      guestName: string | null
      guestPhone: string | null
      paymentStatus: "unpaid" | "paid" | "partial"
      note: string | null
      cleaned: boolean
    }) => {
      const { error } = await supabase.from("room_day_meta").upsert(
        {
          branch_id: input.branchId,
          room_id: input.roomId,
          date: input.date,
          guest_name: input.guestName,
          guest_phone: input.guestPhone,
          payment_status: input.paymentStatus,
          note: input.note,
          cleaned: input.cleaned,
        },
        { onConflict: "room_id,date" }
      )
      if (error) throw error
      await refresh()
    },
    [refresh]
  )

  const deleteMeta = useCallback(
    async (input: { roomId: UUID; date: string }) => {
      const { error } = await supabase.from("room_day_meta").delete().eq("room_id", input.roomId).eq("date", input.date)
      if (error) throw error
      await refresh()
    },
    [refresh]
  )

  return { metas, isLoading, error, refresh, upsertMeta, deleteMeta }
}

