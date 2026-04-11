import { format, parseISO } from "date-fns"
import { vi } from "date-fns/locale"
import { useMemo, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useDashboardStats } from "@/hooks/useDashboardStats"

function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function prevMonthYm(ymStr: string) {
  const [y, m] = ymStr.split("-").map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function formatMonthTitle(ym: string) {
  return format(parseISO(`${ym}-01`), "MMMM yyyy", { locale: vi })
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

function DailyBarChart({
  series,
  compareSeries,
  currentLabel,
  compareLabel,
}: {
  series: Array<{ date: string; total: number }>
  compareSeries?: Array<{ date: string; total: number }>
  currentLabel: string
  compareLabel?: string | null
}) {
  const max = Math.max(
    1,
    ...series.map((s) => s.total),
    ...(compareSeries?.map((s) => s.total) ?? []),
  )
  const points = series.map((s, i) => {
    const c = compareSeries?.[i]
    const compareTotal = c?.total ?? 0
    return {
      ...s,
      day: format(parseISO(s.date), "dd"),
      compareTotal,
      compareDate: c?.date,
    }
  })

  const showCompare = Boolean(compareSeries?.length && compareLabel)

  /** h-24 = 6rem; use px for bar height so bars render even when % parent chain is ambiguous */
  const chartPx = 96

  return (
    <Card size="sm">
      <CardHeader className="pb-2 pt-3">
        <CardTitle>Ghi nhận theo ngày</CardTitle>
        <CardDescription>
          {showCompare
            ? `So sánh ${currentLabel} với ${compareLabel} · chạm cột để xem số (mobile)`
            : "Tổng tiền đã nhập (mọi trạng thái thu) · chạm cột để xem số (mobile)"}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 pb-3">
        {showCompare ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pb-1.5">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-primary/70" aria-hidden />
              {currentLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-muted-foreground/45" aria-hidden />
              {compareLabel}
            </span>
          </div>
        ) : null}
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">Chưa có dữ liệu ghi nhận trong tháng này.</p>
        ) : (
          <div className="max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <div
              className="min-w-[520px] sm:min-w-[720px] grid gap-0.5 sm:gap-1"
              style={{
                gridTemplateColumns: `repeat(${points.length}, minmax(12px, 1fr))`,
              }}
            >
              {points.map((p) => {
                const barH = Math.max(2, Math.round((p.total / max) * chartPx))
                const compareBarH = Math.max(2, Math.round((p.compareTotal / max) * chartPx))
                return (
                  <div key={p.date} className="grid gap-1 min-w-0">
                    {/* stretch columns to chartPx so bar heights resolve; avoid items-end which collapses height */}
                    <div className="flex gap-px justify-center" style={{ height: chartPx }}>
                      {showCompare ? (
                        <>
                          <div
                            className="h-full w-1/2 min-w-0 flex flex-col justify-end"
                            title={`${currentLabel} ${format(parseISO(p.date), "dd/MM")}: ${formatVnd(p.total)}`}
                          >
                            <div
                              className="w-full bg-primary/70 border border-primary/20 hover:bg-primary/85 rounded-sm shrink-0"
                              style={{ height: barH }}
                            />
                          </div>
                          <div
                            className="h-full w-1/2 min-w-0 flex flex-col justify-end"
                            title={
                              p.compareDate
                                ? `${compareLabel} ${format(parseISO(p.compareDate), "dd/MM")}: ${formatVnd(p.compareTotal)}`
                                : `${compareLabel}: 0`
                            }
                          >
                            <div
                              className="w-full bg-muted-foreground/45 border border-border hover:bg-muted-foreground/55 rounded-sm shrink-0"
                              style={{ height: compareBarH }}
                            />
                          </div>
                        </>
                      ) : (
                        <div
                          className="h-full w-full flex flex-col justify-end"
                          title={`${format(parseISO(p.date), "dd/MM")}: ${formatVnd(p.total)}`}
                        >
                          <div
                            className="w-full bg-muted/40 border hover:bg-muted/60 shrink-0"
                            style={{ height: barH }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground text-center tabular-nums">{p.day}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const [month, setMonth] = useState(() => ym(new Date()))
  const [compareMonth, setCompareMonth] = useState<string | null>(() => prevMonthYm(ym(new Date())))

  const { stats, isLoading, error, refresh } = useDashboardStats({ month, compareMonth })

  const currentMonthTitle = useMemo(() => formatMonthTitle(month), [month])

  const pctRooms = useMemo(() => {
    if (!stats.totalRooms) return 0
    return (stats.roomsWithRevenue / stats.totalRooms) * 100
  }, [stats.roomsWithRevenue, stats.totalRooms])

  const topBranchTotal = stats.branchTotals[0]?.total ?? 0

  const compareHint = stats.compareMonthLabel ? `So với ${stats.compareMonthLabel}` : "Chưa so sánh"

  return (
    <div className="grid gap-2 sm:gap-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <div className="text-base font-semibold leading-tight sm:text-lg">Tổng quan</div>
          <div className="text-xs text-muted-foreground leading-snug sm:text-sm">
            Theo dõi doanh thu theo tháng, theo ngày và theo chi nhánh.
          </div>
        </div>
      </div>

      <Card size="sm">
        <CardContent className="py-3 grid gap-2">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="dash-month">Tháng chính</Label>
              <Input
                id="dash-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="dash-compare">So sánh với</Label>
              <Input
                id="dash-compare"
                type="month"
                value={compareMonth ?? ""}
                onChange={(e) => setCompareMonth(e.target.value ? e.target.value : null)}
              />
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="w-full sm:w-auto"
                disabled={compareMonth === null}
                onClick={() => setCompareMonth(null)}
              >
                Xóa so sánh
              </Button>
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => void refresh()}>
                Làm mới
              </Button>
            </div>
          </div>
          {compareMonth === null ? (
            <p className="text-xs text-muted-foreground leading-snug">
              Chọn tháng ở &quot;So sánh với&quot; để xem % thay đổi và biểu đồ hai cột. Hoặc nhấn &quot;Đặt tháng trước&quot; bên dưới.
            </p>
          ) : null}
          {compareMonth === null ? (
            <Button variant="secondary" size="sm" type="button" className="w-fit" onClick={() => setCompareMonth(prevMonthYm(month))}>
              Đặt tháng trước ({formatMonthTitle(prevMonthYm(month))})
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2 md:grid-cols-3 md:gap-2.5">
        <Card size="sm" className="border-emerald-500/25 bg-emerald-500/3 dark:bg-emerald-500/5">
          <CardHeader className="pb-1.5 pt-3">
            <CardDescription>Đã thu</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
              {isLoading ? "…" : formatVnd(stats.revenuePaid)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {compareHint}:{" "}
            <DeltaLabel
              value={
                stats.compareMonth
                  ? stats.revenuePaidCompare > 0
                    ? ((stats.revenuePaid - stats.revenuePaidCompare) / stats.revenuePaidCompare) * 100
                    : stats.revenuePaid > 0
                      ? 100
                      : null
                  : null
              }
            />
          </CardContent>
        </Card>

        <Card size="sm" className="border-amber-500/25 bg-amber-500/3 dark:bg-amber-500/5">
          <CardHeader className="pb-1.5 pt-3">
            <CardDescription>Thu một phần</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums text-amber-900 dark:text-amber-200">
              {isLoading ? "…" : formatVnd(stats.revenuePartial)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {compareHint}:{" "}
            <DeltaLabel
              value={
                stats.compareMonth
                  ? stats.revenuePartialCompare > 0
                    ? ((stats.revenuePartial - stats.revenuePartialCompare) / stats.revenuePartialCompare) * 100
                    : stats.revenuePartial > 0
                      ? 100
                      : null
                  : null
              }
            />
          </CardContent>
        </Card>

        <Card size="sm" className="border-destructive/20 bg-destructive/3 dark:bg-destructive/10">
          <CardHeader className="pb-1.5 pt-3">
            <CardDescription>Chưa thu</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums text-destructive">
              {isLoading ? "…" : formatVnd(stats.revenueUnpaid)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {compareHint}:{" "}
            <DeltaLabel
              value={
                stats.compareMonth
                  ? stats.revenueUnpaidCompare > 0
                    ? ((stats.revenueUnpaid - stats.revenueUnpaidCompare) / stats.revenueUnpaidCompare) * 100
                    : stats.revenueUnpaid > 0
                      ? 100
                      : null
                  : null
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2 md:grid-cols-2 md:gap-2.5">
        <Card size="sm">
          <CardHeader className="pb-1.5 pt-3">
            <CardDescription>Tổng ghi nhận (tháng)</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {isLoading ? "…" : formatVnd(stats.totalThisMonth)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Cộng 3 loại theo thanh toán (đã thu + thu một phần + chưa thu). Trùng với tổng số tiền đã nhập trên lịch doanh thu.
            <div className="mt-1.5">
              {stats.compareMonthLabel ? (
                <>
                  So với {stats.compareMonthLabel}: <DeltaLabel value={stats.deltaPct} />
                </>
              ) : (
                <span>Chưa chọn tháng so sánh — không hiển thị %.</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1.5 pt-3">
            <CardDescription>Trung bình ghi nhận / ngày</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {isLoading ? "…" : formatVnd(Math.round(stats.avgPerDay))}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Tổng ghi nhận chia cho số ngày trong tháng.</CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1.5 pt-3">
            <CardDescription>Phòng có doanh thu</CardDescription>
            <div className="flex items-baseline gap-2">
              <CardTitle className="text-2xl font-semibold tabular-nums">{isLoading ? "…" : stats.roomsWithRevenue}</CardTitle>
              <span className="text-sm text-muted-foreground tabular-nums">/ {isLoading ? "…" : stats.totalRooms}</span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={Math.min(100, Math.max(0, pctRooms))} className="h-2" />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1.5 pt-3">
            <CardDescription>
              {stats.compareMonthLabel ? `Tổng ghi nhận (${stats.compareMonthLabel})` : "Tổng ghi nhận (tháng so sánh)"}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {isLoading ? "…" : stats.compareMonth ? formatVnd(stats.totalCompareMonth) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {stats.compareMonth ? "Để đối chiếu % tăng/giảm tổng." : "Bật so sánh để xem tổng tháng đối chiếu."}
          </CardContent>
        </Card>
      </div>

      <DailyBarChart
        series={stats.dailyTotals}
        compareSeries={stats.dailyTotalsCompare.length ? stats.dailyTotalsCompare : undefined}
        currentLabel={currentMonthTitle}
        compareLabel={stats.compareMonthLabel}
      />

      <Card size="sm">
        <CardHeader className="pb-2 pt-3">
          <CardTitle>Xếp hạng chi nhánh</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1.5 pb-3">
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
                  <Progress value={Math.min(100, Math.max(0, pct))} className="h-2" />
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
