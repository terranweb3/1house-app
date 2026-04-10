import { format, parseISO } from "date-fns"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { useDashboardStats } from "@/hooks/useDashboardStats"

function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function formatVnd(n: number) {
  return n.toLocaleString("vi-VN")
}

function DeltaLabel({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>
  const isUp = value >= 0
  const cls = isUp ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
  const sign = isUp ? "+" : ""
  return <span className={cls}>{`${sign}${value.toFixed(1)}%`}</span>
}

function DailyBarChart({ series }: { series: Array<{ date: string; total: number }> }) {
  const max = Math.max(1, ...series.map((s) => s.total))
  const points = series.map((s) => ({
    ...s,
    day: format(parseISO(s.date), "dd"),
    h: Math.round((s.total / max) * 100),
  }))

  return (
    <div className="border bg-card p-3 min-w-0">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <div className="text-sm font-medium">Doanh thu theo ngày</div>
        <div className="text-xs text-muted-foreground sm:text-right">Chạm để xem chi tiết (mobile)</div>
      </div>

      <div className="mt-3 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <div
          className="min-w-[520px] sm:min-w-[720px] grid grid-cols-[repeat(var(--n),minmax(12px,1fr))] gap-0.5 sm:gap-1"
          style={{ ["--n" as never]: points.length }}
        >
          {points.map((p) => (
            <div key={p.date} className="grid gap-1">
              <div className="h-24 flex items-end">
                <div
                  className="w-full bg-muted/40 border hover:bg-muted/60"
                  style={{ height: `${Math.max(2, p.h)}%` }}
                  title={`${format(parseISO(p.date), "dd/MM")}: ${formatVnd(p.total)}`}
                />
              </div>
              <div className="text-[10px] text-muted-foreground text-center tabular-nums">{p.day}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const [month, setMonth] = useState(() => ym(new Date()))
  const { stats, isLoading, error, refresh } = useDashboardStats({ month })

  const pctRooms = useMemo(() => {
    if (!stats.totalRooms) return 0
    return (stats.roomsWithRevenue / stats.totalRooms) * 100
  }, [stats.roomsWithRevenue, stats.totalRooms])

  const topBranchTotal = stats.branchTotals[0]?.total ?? 0

  return (
    <div className="grid gap-4 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Tổng quan</div>
          <div className="text-sm text-muted-foreground">Theo dõi doanh thu theo tháng, theo ngày và theo chi nhánh.</div>
        </div>
      </div>

      <div className="grid gap-3 border bg-card p-3 md:grid-cols-3">
        <label className="grid gap-1 text-xs">
          <div className="text-muted-foreground">Tháng</div>
          <input className="h-9 border bg-background px-2 text-sm" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>

        <div className="flex items-end justify-end gap-2 md:col-span-2">
          <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={() => void refresh()}>
            Làm mới
          </Button>
        </div>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="border bg-card p-3">
          <div className="text-xs text-muted-foreground">Tổng doanh thu tháng</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{isLoading ? "…" : formatVnd(stats.totalThisMonth)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            So với tháng trước: <DeltaLabel value={stats.deltaPct} />
          </div>
        </div>

        <div className="border bg-card p-3">
          <div className="text-xs text-muted-foreground">Doanh thu trung bình / ngày</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{isLoading ? "…" : formatVnd(Math.round(stats.avgPerDay))}</div>
          <div className="mt-1 text-xs text-muted-foreground">Tính trên số ngày trong tháng đã chọn.</div>
        </div>

        <div className="border bg-card p-3">
          <div className="text-xs text-muted-foreground">Phòng có doanh thu</div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-2xl font-semibold tabular-nums">{isLoading ? "…" : stats.roomsWithRevenue}</div>
            <div className="text-sm text-muted-foreground tabular-nums">/ {isLoading ? "…" : stats.totalRooms}</div>
          </div>
          <div className="mt-2 h-2 w-full bg-muted/30 border">
            <div className="h-full bg-muted" style={{ width: `${Math.min(100, Math.max(0, pctRooms))}%` }} />
          </div>
        </div>

        <div className="border bg-card p-3">
          <div className="text-xs text-muted-foreground">Tháng trước</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{isLoading ? "…" : formatVnd(stats.totalPrevMonth)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Dùng để tính phần trăm tăng/giảm.</div>
        </div>
      </div>

      <DailyBarChart series={stats.dailyTotals} />

      <div className="border bg-card p-3">
        <div className="text-sm font-medium">Xếp hạng chi nhánh</div>
        <div className="mt-3 grid gap-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Đang tải...</div>
          ) : stats.branchTotals.length === 0 ? (
            <div className="text-sm text-muted-foreground">Chưa có chi nhánh</div>
          ) : (
            stats.branchTotals.map((b) => {
              const pct = topBranchTotal > 0 ? (b.total / topBranchTotal) * 100 : 0
              return (
                <div key={b.branchId} className="grid gap-1">
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <div className="text-sm truncate min-w-0 flex-1">{b.branchName}</div>
                    <div className="text-sm font-medium tabular-nums shrink-0">{b.total ? formatVnd(b.total) : ""}</div>
                  </div>
                  <div className="h-2 w-full bg-muted/30 border">
                    <div className="h-full bg-muted" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
