import { useCallback, useEffect, useState } from "react"

import type { Branch, UUID } from "@/lib/types"
import { supabase } from "@/lib/supabase"

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("created_at", { ascending: true })
      if (error) throw error
      setBranches((data ?? []) as Branch[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Tải danh sách chi nhánh thất bại")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createBranch = useCallback(
    async (input: Pick<Branch, "name" | "address">) => {
      const { error } = await supabase.from("branches").insert(input)
      if (error) throw error
      await refresh()
    },
    [refresh]
  )

  const updateBranch = useCallback(
    async (input: Partial<Pick<Branch, "name" | "address">> & { id: UUID }) => {
      const { id, ...patch } = input
      const { error } = await supabase.from("branches").update(patch).eq("id", id)
      if (error) throw error
      await refresh()
    },
    [refresh]
  )

  const deleteBranch = useCallback(
    async (id: UUID) => {
      const { error } = await supabase.from("branches").delete().eq("id", id)
      if (error) throw error
      await refresh()
    },
    [refresh]
  )

  return { branches, isLoading, error, refresh, createBranch, updateBranch, deleteBranch }
}

