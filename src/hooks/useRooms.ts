import { useCallback, useEffect, useMemo, useState } from "react"

import type { Room, RoomStatus, UUID } from "@/lib/types"
import { supabase } from "@/lib/supabase"

export function useRooms(branchId?: UUID | "all") {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const normalizedBranchId = useMemo(() => branchId ?? "all", [branchId])

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    if (!silent) setIsLoading(true)
    setError(null)
    try {
      let q = supabase.from("rooms").select("*").order("room_number", { ascending: true })
      if (normalizedBranchId !== "all") q = q.eq("branch_id", normalizedBranchId)

      const { data, error } = await q
      if (error) throw error
      setRooms((data ?? []) as Room[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Tải danh sách phòng thất bại")
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [normalizedBranchId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createRoom = useCallback(
    async (
      input: Pick<Room, "branch_id" | "room_number" | "room_type" | "status" | "notes">
    ) => {
      const { error } = await supabase.from("rooms").insert(input)
      if (error) throw error
      await refresh({ silent: true })
    },
    [refresh]
  )

  const createRoomsBulk = useCallback(
    async (args: {
      rooms: Array<Pick<Room, "branch_id" | "room_number" | "room_type" | "status" | "notes">>
      ignoreDuplicates?: boolean
    }) => {
      if (args.rooms.length === 0) return

      if (args.ignoreDuplicates) {
        const { error } = await supabase
          .from("rooms")
          .upsert(args.rooms, { onConflict: "branch_id,room_number", ignoreDuplicates: true })
        if (error) throw error
      } else {
        const { error } = await supabase.from("rooms").insert(args.rooms)
        if (error) throw error
      }

      await refresh({ silent: true })
    },
    [refresh]
  )

  const updateRoom = useCallback(
    async (
      input: Partial<Pick<Room, "room_number" | "room_type" | "status" | "notes">> & { id: UUID }
    ) => {
      const { id, ...patch } = input
      const { error } = await supabase.from("rooms").update(patch).eq("id", id)
      if (error) throw error
      await refresh({ silent: true })
    },
    [refresh]
  )

  const deleteRoom = useCallback(
    async (id: UUID) => {
      const { error } = await supabase.from("rooms").delete().eq("id", id)
      if (error) throw error
      await refresh({ silent: true })
    },
    [refresh]
  )

  const setRoomStatus = useCallback(
    async (args: { id: UUID; status: RoomStatus }) => {
      const { error } = await supabase.from("rooms").update({ status: args.status }).eq("id", args.id)
      if (error) throw error
      await refresh({ silent: true })
    },
    [refresh]
  )

  return { rooms, isLoading, error, refresh, createRoom, createRoomsBulk, updateRoom, deleteRoom, setRoomStatus }
}

