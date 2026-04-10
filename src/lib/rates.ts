import { supabase } from "@/lib/supabase"
import type { UUID } from "@/lib/types"

export async function upsertRatesBatch(input: Array<{ branchId: UUID; roomId: UUID; date: string; price: number }>) {
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
}

