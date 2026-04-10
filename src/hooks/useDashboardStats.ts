import { addMonths, eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth } from "date-fns"
import { useCallback, useMemo } from "react"

import { useBranches } from "@/hooks/useBranches"
import { useRooms } from "@/hooks/useRooms"
import { useRates } from "@/hooks/useRates"

function monthRange(month: string) {
  const [yStr, mStr] = month.split("-")
  const d = new Date(Number(yStr), Number(mStr) - 1, 1)
  const from = startOfMonth(d)
  const to = endOfMonth(d)
  return { from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd"), fromDate: from, toDate: to }
}

export type DashboardStats = {
  month: string
  totalThisMonth: number
  totalPrevMonth: number
  deltaPct: number | null
  avgPerDay: number
  roomsWithRevenue: number
  totalRooms: number
  dailyTotals: Array<{ date: string; total: number }>
  branchTotals: Array<{ branchId: string; branchName: string; total: number }>
}

export function useDashboardStats(args: { month: string }) {
  const { branches } = useBranches()
  const { rooms } = useRooms("all")

  const rangeThis = useMemo(() => monthRange(args.month), [args.month])
  const prevMonth = useMemo(() => format(addMonths(rangeThis.fromDate, -1), "yyyy-MM"), [rangeThis.fromDate])
  const rangePrev = useMemo(() => monthRange(prevMonth), [prevMonth])

  const thisRates = useRates({ branchId: "all", from: rangeThis.from, to: rangeThis.to })
  const prevRates = useRates({ branchId: "all", from: rangePrev.from, to: rangePrev.to })

  const refresh = useCallback(async () => {
    await Promise.all([thisRates.refresh(), prevRates.refresh()])
  }, [prevRates, thisRates])

  const stats = useMemo<DashboardStats>(() => {
    const totalThisMonth = thisRates.rates.reduce((sum, r) => sum + Number(r.price || 0), 0)
    const totalPrevMonth = prevRates.rates.reduce((sum, r) => sum + Number(r.price || 0), 0)
    const deltaPct =
      totalPrevMonth > 0 ? ((totalThisMonth - totalPrevMonth) / totalPrevMonth) * 100 : totalThisMonth > 0 ? 100 : null

    const days = eachDayOfInterval({ start: parseISO(rangeThis.from), end: parseISO(rangeThis.to) })
    const dayTotalByDate = new Map<string, number>()
    for (const d of days) dayTotalByDate.set(format(d, "yyyy-MM-dd"), 0)
    for (const r of thisRates.rates) {
      const key = r.date
      if (!dayTotalByDate.has(key)) continue
      dayTotalByDate.set(key, (dayTotalByDate.get(key) ?? 0) + Number(r.price || 0))
    }
    const dailyTotals = Array.from(dayTotalByDate.entries()).map(([date, total]) => ({ date, total }))

    const roomsWithRevenue = new Set<string>()
    for (const r of thisRates.rates) {
      if (Number(r.price || 0) > 0) roomsWithRevenue.add(r.room_id)
    }

    const branchTotalById = new Map<string, number>()
    for (const b of branches) branchTotalById.set(b.id, 0)
    for (const r of thisRates.rates) {
      branchTotalById.set(r.branch_id, (branchTotalById.get(r.branch_id) ?? 0) + Number(r.price || 0))
    }
    const branchTotals = branches
      .map((b) => ({ branchId: b.id, branchName: b.name, total: branchTotalById.get(b.id) ?? 0 }))
      .sort((a, b) => b.total - a.total)

    const avgPerDay = days.length > 0 ? totalThisMonth / days.length : 0

    return {
      month: args.month,
      totalThisMonth,
      totalPrevMonth,
      deltaPct,
      avgPerDay,
      roomsWithRevenue: roomsWithRevenue.size,
      totalRooms: rooms.length,
      dailyTotals,
      branchTotals,
    }
  }, [args.month, branches, prevRates.rates, rangeThis.from, rangeThis.to, rooms.length, thisRates.rates])

  return {
    stats,
    isLoading: thisRates.isLoading || prevRates.isLoading,
    error: thisRates.error ?? prevRates.error,
    refresh,
  }
}

