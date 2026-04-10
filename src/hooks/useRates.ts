import { useCallback, useEffect, useMemo, useState } from "react"

import type { Rate, UUID } from "@/lib/types"
import { supabase } from "@/lib/supabase"

export function useRates(args: { branchId: UUID | "all"; from: string; to: string }) {
  const [rates, setRates] = useState<Rate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const key = useMemo(() => `${args.branchId}:${args.from}:${args.to}`, [args.branchId, args.from, args.to])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      let q = supabase
        .from("rates")
        .select("*")
        .gte("date", args.from)
        .lte("date", args.to)
        .order("date", { ascending: true })

      if (args.branchId !== "all") q = q.eq("branch_id", args.branchId)

      const { data, error } = await q
      if (error) throw error
      setRates((data ?? []) as Rate[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Tải doanh thu thất bại")
    } finally {
      setIsLoading(false)
    }
  }, [args.branchId, args.from, args.to])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const upsertRate = useCallback(
    async (input: { branchId: UUID; roomId: UUID; date: string; price: number }) => {
      const { error } = await supabase.from("rates").upsert(
        {
          branch_id: input.branchId,
          room_id: input.roomId,
          date: input.date,
          price: input.price,
        },
        { onConflict: "room_id,date" }
      )
      if (error) throw error
      await refresh()
    },
    [refresh]
  )

  const deleteRate = useCallback(
    async (input: { roomId: UUID; date: string }) => {
      const { error } = await supabase.from("rates").delete().eq("room_id", input.roomId).eq("date", input.date)
      if (error) throw error
      await refresh()
    },
    [refresh]
  )

  const upsertRatesBatch = useCallback(
    async (input: Array<{ branchId: UUID; roomId: UUID; date: string; price: number }>) => {
      const rows = input.map((r) => ({
        branch_id: r.branchId,
        room_id: r.roomId,
        date: r.date,
        price: r.price,
      }))

      const chunkSize = 500
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize)
        const { error } = await supabase.from("rates").upsert(chunk, { onConflict: "room_id,date" })
        if (error) throw error
      }
      await refresh()
    },
    [refresh]
  )

  return { rates, isLoading, error, refresh, upsertRate, upsertRatesBatch, deleteRate }
}

