import { eachDayOfInterval, endOfMonth, format, getDate, parseISO, setDate, startOfMonth } from "date-fns"
import { vi } from "date-fns/locale"
import { useCallback, useMemo } from "react"

import { useBranches } from "@/hooks/useBranches"
import { useRooms } from "@/hooks/useRooms"
import { useRates } from "@/hooks/useRates"
import { useRoomDayMeta } from "@/hooks/useRoomDayMeta"
import type { PaymentStatus } from "@/lib/types"

function monthRange(month: string) {
  const [yStr, mStr] = month.split("-")
  const d = new Date(Number(yStr), Number(mStr) - 1, 1)
  const from = startOfMonth(d)
  const to = endOfMonth(d)
  return { from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd"), fromDate: from, toDate: to }
}

function formatMonthLabel(ym: string) {
  return format(parseISO(`${ym}-01`), "MMMM yyyy", { locale: vi })
}

export type DashboardStats = {
  month: string
  compareMonth: string | null
  compareMonthLabel: string | null
  /** Tổng ghi nhận (rates) — bằng tổng 3 loại theo thanh toán */
  totalThisMonth: number
  totalCompareMonth: number
  deltaPct: number | null
  /** Doanh thu theo trạng thái thu tiền (phân bổ theo từng dòng rate) */
  revenuePaid: number
  revenuePartial: number
  revenueUnpaid: number
  revenuePaidCompare: number
  revenuePartialCompare: number
  revenueUnpaidCompare: number
  avgPerDay: number
  roomsWithRevenue: number
  totalRooms: number
  dailyTotals: Array<{ date: string; total: number }>
  /** Cùng thứ tự với dailyTotals; total = 0 nếu ngày không tồn tại ở tháng so sánh */
  dailyTotalsCompare: Array<{ date: string; total: number }>
  branchTotals: Array<{ branchId: string; branchName: string; total: number }>
}

function sumRatesByPayment(
  rates: Array<{ room_id: string; date: string; price: unknown; branch_id: string }>,
  paymentByRoomDate: Map<string, PaymentStatus | undefined>,
) {
  let paid = 0
  let partial = 0
  let unpaid = 0
  for (const r of rates) {
    const p = Number(r.price || 0)
    if (!p) continue
    const key = `${r.room_id}:${r.date}`
    const status = paymentByRoomDate.get(key) ?? "unpaid"
    if (status === "paid") paid += p
    else if (status === "partial") partial += p
    else unpaid += p
  }
  return { paid, partial, unpaid }
}

function metaPaymentMap(
  metas: Array<{ room_id: string; date: string; payment_status: PaymentStatus }>,
): Map<string, PaymentStatus | undefined> {
  const m = new Map<string, PaymentStatus | undefined>()
  for (const x of metas) m.set(`${x.room_id}:${x.date}`, x.payment_status)
  return m
}

export function useDashboardStats(args: { month: string; compareMonth: string | null }) {
  const { branches } = useBranches()
  const { rooms } = useRooms("all")

  const rangeThis = useMemo(() => monthRange(args.month), [args.month])
  const rangeCompare = useMemo(
    () => (args.compareMonth ? monthRange(args.compareMonth) : null),
    [args.compareMonth],
  )

  const thisRates = useRates({ branchId: "all", from: rangeThis.from, to: rangeThis.to })
  const compareRates = useRates({
    branchId: "all",
    from: rangeCompare?.from ?? rangeThis.from,
    to: rangeCompare?.to ?? rangeThis.to,
    enabled: Boolean(args.compareMonth),
  })
  const metaThis = useRoomDayMeta({ branchId: "all", from: rangeThis.from, to: rangeThis.to })
  const metaCompare = useRoomDayMeta({
    branchId: "all",
    from: rangeCompare?.from ?? rangeThis.from,
    to: rangeCompare?.to ?? rangeThis.to,
    enabled: Boolean(args.compareMonth),
  })

  const refresh = useCallback(async () => {
    await Promise.all([
      thisRates.refresh(),
      compareRates.refresh(),
      metaThis.refresh(),
      metaCompare.refresh(),
    ])
  }, [compareRates, metaCompare, metaThis, thisRates])

  const stats = useMemo<DashboardStats>(() => {
    const payThis = metaPaymentMap(metaThis.metas)
    const payCompare = metaPaymentMap(metaCompare.metas)

    const splitThis = sumRatesByPayment(thisRates.rates, payThis)
    const splitCompare = args.compareMonth
      ? sumRatesByPayment(compareRates.rates, payCompare)
      : { paid: 0, partial: 0, unpaid: 0 }

    const totalThisMonth = splitThis.paid + splitThis.partial + splitThis.unpaid
    const totalCompareMonth = splitCompare.paid + splitCompare.partial + splitCompare.unpaid
    const deltaPct =
      args.compareMonth && totalCompareMonth > 0
        ? ((totalThisMonth - totalCompareMonth) / totalCompareMonth) * 100
        : args.compareMonth && totalCompareMonth === 0 && totalThisMonth > 0
          ? 100
          : null

    const days = eachDayOfInterval({ start: parseISO(rangeThis.from), end: parseISO(rangeThis.to) })
    const dayTotalByDate = new Map<string, number>()
    for (const d of days) dayTotalByDate.set(format(d, "yyyy-MM-dd"), 0)
    for (const r of thisRates.rates) {
      const key = r.date
      if (!dayTotalByDate.has(key)) continue
      dayTotalByDate.set(key, (dayTotalByDate.get(key) ?? 0) + Number(r.price || 0))
    }
    const dailyTotals = Array.from(dayTotalByDate.entries()).map(([date, total]) => ({ date, total }))

    let dailyTotalsCompare: Array<{ date: string; total: number }> = []
    if (args.compareMonth && rangeCompare) {
      const compareStart = parseISO(rangeCompare.from)
      const lastDayCompare = endOfMonth(compareStart).getDate()
      const dayTotalCompareByDate = new Map<string, number>()
      const daysC = eachDayOfInterval({ start: parseISO(rangeCompare.from), end: parseISO(rangeCompare.to) })
      for (const d of daysC) dayTotalCompareByDate.set(format(d, "yyyy-MM-dd"), 0)
      for (const r of compareRates.rates) {
        const key = r.date
        if (!dayTotalCompareByDate.has(key)) continue
        dayTotalCompareByDate.set(key, (dayTotalCompareByDate.get(key) ?? 0) + Number(r.price || 0))
      }
      dailyTotalsCompare = dailyTotals.map(({ date }) => {
        const dom = getDate(parseISO(date))
        if (dom > lastDayCompare) {
          return { date: rangeCompare.from, total: 0 }
        }
        const cmp = format(setDate(startOfMonth(compareStart), dom), "yyyy-MM-dd")
        return { date: cmp, total: dayTotalCompareByDate.get(cmp) ?? 0 }
      })
    }

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
      compareMonth: args.compareMonth,
      compareMonthLabel: args.compareMonth ? formatMonthLabel(args.compareMonth) : null,
      totalThisMonth,
      totalCompareMonth,
      deltaPct,
      revenuePaid: splitThis.paid,
      revenuePartial: splitThis.partial,
      revenueUnpaid: splitThis.unpaid,
      revenuePaidCompare: splitCompare.paid,
      revenuePartialCompare: splitCompare.partial,
      revenueUnpaidCompare: splitCompare.unpaid,
      avgPerDay,
      roomsWithRevenue: roomsWithRevenue.size,
      totalRooms: rooms.length,
      dailyTotals,
      dailyTotalsCompare,
      branchTotals,
    }
  }, [
    args.compareMonth,
    args.month,
    branches,
    compareRates.rates,
    metaCompare.metas,
    metaThis.metas,
    rangeCompare,
    rangeThis.from,
    rangeThis.to,
    rooms.length,
    thisRates.rates,
  ])

  return {
    stats,
    isLoading:
      thisRates.isLoading ||
      compareRates.isLoading ||
      metaThis.isLoading ||
      metaCompare.isLoading,
    error: thisRates.error ?? compareRates.error ?? metaThis.error ?? metaCompare.error,
    refresh,
  }
}
