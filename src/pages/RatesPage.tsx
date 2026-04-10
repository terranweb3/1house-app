import { eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth } from "date-fns"
import { useMemo, useState } from "react"

import { Dialog } from "@base-ui/react/dialog"
import { Button } from "@/components/ui/button"
import { ImportCsvDialog } from "@/components/revenue/ImportCsvDialog"
import { useBranches } from "@/hooks/useBranches"
import { useRooms } from "@/hooks/useRooms"
import { useRates } from "@/hooks/useRates"
import { useRoomDayMeta } from "@/hooks/useRoomDayMeta"
import type { UUID } from "@/lib/types"

function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function monthRange(month: string) {
  const [yStr, mStr] = month.split("-")
  const d = new Date(Number(yStr), Number(mStr) - 1, 1)
  const from = startOfMonth(d)
  const to = endOfMonth(d)
  return { from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd") }
}

function roomSortKey(roomNumber: string): number {
  const n = Number(roomNumber)
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY
}

function dayLabel(d: Date): string {
  const day = d.getDay()
  if (day === 0) return "CN"
  return `Thứ ${day + 1}`
}

function csvEscape(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function plusMonth(month: string, delta: number) {
  const [yStr, mStr] = month.split("-")
  const d = new Date(Number(yStr), Number(mStr) - 1 + delta, 1)
  return ym(d)
}

function iso(d: Date) {
  return format(d, "yyyy-MM-dd")
}

function mondayStart(d: Date) {
  const copy = new Date(d)
  const mondayIndex = (copy.getDay() + 6) % 7 // Mon=0..Sun=6
  copy.setDate(copy.getDate() - mondayIndex)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function RatesPage() {
  const { branches, isLoading: branchesLoading } = useBranches()
  const [branchId, setBranchId] = useState<UUID | "all">("all")
  const [month, setMonth] = useState(() => ym(new Date()))
  const [isImportOpen, setIsImportOpen] = useState(false)

  const [cellDialogOpen, setCellDialogOpen] = useState(false)
  const [cellDialogRoomId, setCellDialogRoomId] = useState<UUID | null>(null)
  const [cellDialogDate, setCellDialogDate] = useState<string>("")
  const [cellDialogValue, setCellDialogValue] = useState("")
  const [cellDialogGuestName, setCellDialogGuestName] = useState("")
  const [cellDialogGuestPhone, setCellDialogGuestPhone] = useState("")
  const [cellDialogPaymentStatus, setCellDialogPaymentStatus] = useState<"unpaid" | "paid" | "partial">("unpaid")
  const [cellDialogNote, setCellDialogNote] = useState("")

  const [dayDetailOpen, setDayDetailOpen] = useState(false)
  const [selectedDayIso, setSelectedDayIso] = useState<string>("")
  const [weekAnchorIso, setWeekAnchorIso] = useState<string>(() => monthRange(ym(new Date())).from)

  const { rooms } = useRooms(branchId === "all" ? "all" : branchId)

  const range = useMemo(() => monthRange(month), [month])

  function setMonthAndClampWeek(nextMonth: string) {
    setMonth(nextMonth)
    setWeekAnchorIso(monthRange(nextMonth).from)
  }

  const { rates, isLoading, error, upsertRate, upsertRatesBatch, deleteRate } = useRates({
    branchId,
    from: range.from,
    to: range.to,
  })

  const {
    metas,
    error: metaError,
    upsertMeta,
    deleteMeta,
  } = useRoomDayMeta({ branchId, from: range.from, to: range.to })

  const days = useMemo(() => {
    if (!range.from || !range.to) return []
    return eachDayOfInterval({ start: parseISO(range.from), end: parseISO(range.to) })
  }, [range])

  const rateByRoomDate = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rates) m.set(`${r.room_id}:${r.date}`, Number(r.price))
    return m
  }, [rates])

  const metaByRoomDate = useMemo(() => {
    const m = new Map<string, (typeof metas)[number]>()
    for (const x of metas) m.set(`${x.room_id}:${x.date}`, x)
    return m
  }, [metas])

  const branchNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const b of branches) m.set(b.id, b.name)
    return m
  }, [branches])

  function openCellDialog(roomId: UUID, date: string) {
    const current = rateByRoomDate.get(`${roomId}:${date}`)
    const meta = metaByRoomDate.get(`${roomId}:${date}`)
    setCellDialogRoomId(roomId)
    setCellDialogDate(date)
    setCellDialogValue(typeof current === "number" ? String(current) : "")
    setCellDialogGuestName(meta?.guest_name ?? "")
    setCellDialogGuestPhone(meta?.guest_phone ?? "")
    setCellDialogPaymentStatus(meta?.payment_status ?? "unpaid")
    setCellDialogNote(meta?.note ?? "")
    setCellDialogOpen(true)
  }

  async function commitCellDialog() {
    if (!cellDialogRoomId || !cellDialogDate) return
    const raw = cellDialogValue.replaceAll(",", "").trim()
    const room = rooms.find((r) => r.id === cellDialogRoomId)
    if (!room) return

    // Save revenue (blank => delete)
    if (!raw) {
      await deleteRate({ roomId: cellDialogRoomId, date: cellDialogDate })
    } else {
      const next = Number(raw)
      if (!Number.isFinite(next) || next < 0) return
      await upsertRate({ branchId: room.branch_id as UUID, roomId: cellDialogRoomId, date: cellDialogDate, price: next })
    }

    // Save guest meta (only if any field is set, else delete)
    const guestName = cellDialogGuestName.trim() || null
    const guestPhone = cellDialogGuestPhone.trim() || null
    const note = cellDialogNote.trim() || null
    const hasMeta = Boolean(guestName || guestPhone || note || cellDialogPaymentStatus !== "unpaid")
    if (hasMeta) {
      await upsertMeta({
        branchId: room.branch_id as UUID,
        roomId: cellDialogRoomId,
        date: cellDialogDate,
        guestName,
        guestPhone,
        paymentStatus: cellDialogPaymentStatus,
        note,
      })
    } else {
      await deleteMeta({ roomId: cellDialogRoomId, date: cellDialogDate })
    }

    setCellDialogOpen(false)
  }

  async function quickDeleteCellDialog() {
    if (!cellDialogRoomId || !cellDialogDate) return
    await deleteRate({ roomId: cellDialogRoomId, date: cellDialogDate })
    await deleteMeta({ roomId: cellDialogRoomId, date: cellDialogDate })
    setCellDialogOpen(false)
  }

  const selectedBranches = useMemo(() => {
    if (branchId === "all") return branches
    return branches.filter((b) => b.id === branchId)
  }, [branches, branchId])

  const roomsByBranch = useMemo(() => {
    const m = new Map<string, typeof rooms>()
    for (const b of selectedBranches) {
      const branchRooms = rooms
        .filter((r) => r.branch_id === b.id)
        .slice()
        .sort((a, b2) => roomSortKey(a.room_number) - roomSortKey(b2.room_number))
      m.set(b.id, branchRooms)
    }
    return m
  }, [rooms, selectedBranches])

  const flatRooms = useMemo(() => {
    const acc: typeof rooms = []
    for (const b of selectedBranches) {
      const rs = roomsByBranch.get(b.id) ?? []
      acc.push(...rs)
    }
    return acc
  }, [roomsByBranch, selectedBranches])

  const monthTotals = useMemo(() => {
    const byRoom = new Map<string, number>()
    let grand = 0
    for (const d of days) {
      const date = format(d, "yyyy-MM-dd")
      for (const r of flatRooms) {
        const v = rateByRoomDate.get(`${r.id}:${date}`) ?? 0
        if (v) {
          byRoom.set(r.id, (byRoom.get(r.id) ?? 0) + v)
          grand += v
        }
      }
    }
    return { byRoom, grand }
  }, [days, flatRooms, rateByRoomDate])

  const dailyTotals = useMemo(() => {
    const m = new Map<string, { total: number; filled: number }>()
    for (const d of days) {
      const date = format(d, "yyyy-MM-dd")
      let total = 0
      let filled = 0
      for (const r of flatRooms) {
        const v = rateByRoomDate.get(`${r.id}:${date}`)
        if (typeof v === "number" && v > 0) {
          total += v
          filled += 1
        }
      }
      m.set(date, { total, filled })
    }
    return m
  }, [days, flatRooms, rateByRoomDate])

  const calendarCells = useMemo(() => {
    // Monday-first calendar grid (6 weeks).
    const start = parseISO(range.from)
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1)
    const monthIndex = monthStart.getMonth()
    const mondayIndex = (monthStart.getDay() + 6) % 7 // Mon=0..Sun=6
    const gridStart = new Date(monthStart)
    gridStart.setDate(monthStart.getDate() - mondayIndex)

    const cells: Array<{ d: Date; iso: string; inMonth: boolean }> = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      cells.push({ d, iso: format(d, "yyyy-MM-dd"), inMonth: d.getMonth() === monthIndex })
    }
    return cells
  }, [range.from])

  const weekDays = useMemo(() => {
    const anchor = parseISO(weekAnchorIso || range.from)
    const start = mondayStart(anchor)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return { d, iso: iso(d), inMonth: d >= parseISO(range.from) && d <= parseISO(range.to) }
    })
  }, [range.from, range.to, weekAnchorIso])

  const selectedDayMeta = useMemo(() => {
    if (!selectedDayIso) return null
    const t = dailyTotals.get(selectedDayIso) ?? { total: 0, filled: 0 }
    return { ...t, iso: selectedDayIso }
  }, [dailyTotals, selectedDayIso])

  function exportCsv() {
    const monthLabel = month

    const header1: string[] = ["", ""]
    for (const b of selectedBranches) {
      const rs = roomsByBranch.get(b.id) ?? []
      if (rs.length === 0) continue
      for (let i = 0; i < rs.length; i++) header1.push(i === 0 ? b.name : "")
    }
    header1.push("Tổng")

    const header2: string[] = ["Ngày", "Thứ"]
    for (const r of flatRooms) header2.push(r.room_number)
    header2.push("Tổng")

    const lines: string[] = []
    lines.push(header1.map((c) => csvEscape(c)).join(","))
    lines.push(header2.map((c) => csvEscape(c)).join(","))

    for (const d of days) {
      const iso = format(d, "yyyy-MM-dd")
      const dateCell = format(d, "dd/MM/yyyy")
      const dowCell = dayLabel(d)
      const row: string[] = [csvEscape(dateCell), csvEscape(dowCell)]

      let rowTotal = 0
      for (const r of flatRooms) {
        const v = rateByRoomDate.get(`${r.id}:${iso}`)
        if (typeof v === "number") {
          row.push(String(v))
          rowTotal += v
        } else {
          row.push("")
        }
      }
      row.push(rowTotal ? String(rowTotal) : "")
      lines.push(row.join(","))
    }

    const totalRow: string[] = [csvEscape("Tổng tháng"), csvEscape("")]
    for (const r of flatRooms) {
      const v = monthTotals.byRoom.get(r.id) ?? 0
      totalRow.push(v ? String(v) : "")
    }
    totalRow.push(monthTotals.grand ? String(monthTotals.grand) : "")
    lines.push(totalRow.join(","))

    const bom = "\ufeff"
    const csv = bom + lines.join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `1house_doanhthu_${monthLabel}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-4">
      <ImportCsvDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        branches={branches}
        rooms={rooms}
        onConfirmImport={async (recs) => {
          await upsertRatesBatch(recs)
        }}
      />

      <Dialog.Root
        open={cellDialogOpen}
        onOpenChange={(next) => {
          setCellDialogOpen(next)
          if (!next) {
            setCellDialogRoomId(null)
            setCellDialogDate("")
            setCellDialogValue("")
            setCellDialogGuestName("")
            setCellDialogGuestPhone("")
            setCellDialogPaymentStatus("unpaid")
            setCellDialogNote("")
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Nhập doanh thu</div>
                <div className="text-xs text-muted-foreground">
                  {cellDialogRoomId && cellDialogDate ? (
                    <>
                      Phòng <span className="font-medium">{rooms.find((r) => r.id === cellDialogRoomId)?.room_number ?? ""}</span>{" "}
                      - <span className="font-medium">{cellDialogDate}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <Button variant="outline" size="xs" type="button" onClick={() => setCellDialogOpen(false)}>
                Đóng
              </Button>
            </div>

            <div className="mt-4 grid gap-2">
              <label className="grid gap-1 text-xs">
                <div className="text-muted-foreground">Số tiền (để trống để xoá)</div>
                <input
                  className="h-9 border bg-background px-2 text-sm tabular-nums"
                  inputMode="numeric"
                  autoFocus
                  value={cellDialogValue}
                  onChange={(e) => setCellDialogValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setCellDialogOpen(false)
                    if (e.key === "Enter") void commitCellDialog()
                  }}
                />
              </label>

              <div className="grid gap-2 md:grid-cols-2">
                <label className="grid gap-1 text-xs">
                  <div className="text-muted-foreground">Tên khách</div>
                  <input
                    className="h-9 border bg-background px-2 text-sm"
                    placeholder="Ví dụ: Anh A"
                    value={cellDialogGuestName}
                    onChange={(e) => setCellDialogGuestName(e.target.value)}
                  />
                </label>

                <label className="grid gap-1 text-xs">
                  <div className="text-muted-foreground">SĐT khách</div>
                  <input
                    className="h-9 border bg-background px-2 text-sm tabular-nums"
                    inputMode="tel"
                    placeholder="Ví dụ: 090..."
                    value={cellDialogGuestPhone}
                    onChange={(e) => setCellDialogGuestPhone(e.target.value)}
                  />
                </label>

                <label className="grid gap-1 text-xs">
                  <div className="text-muted-foreground">Thanh toán</div>
                  <select
                    className="h-9 border bg-background px-2 text-sm"
                    value={cellDialogPaymentStatus}
                    onChange={(e) => setCellDialogPaymentStatus(e.target.value as "unpaid" | "paid" | "partial")}
                  >
                    <option value="unpaid">Chưa thu</option>
                    <option value="partial">Thu một phần</option>
                    <option value="paid">Đã thu</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-1 text-xs">
                <div className="text-muted-foreground">Ghi chú</div>
                <textarea
                  className="min-h-20 border bg-background px-2 py-2 text-sm"
                  value={cellDialogNote}
                  onChange={(e) => setCellDialogNote(e.target.value)}
                  placeholder="Ví dụ: Khách chuyển khoản, xuất hoá đơn..."
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              {cellDialogRoomId && cellDialogDate && rateByRoomDate.has(`${cellDialogRoomId}:${cellDialogDate}`) ? (
                <Button variant="destructive" type="button" onClick={() => void quickDeleteCellDialog()}>
                  Xoá nhanh
                </Button>
              ) : null}
              <Button variant="outline" type="button" onClick={() => setCellDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="button" onClick={() => void commitCellDialog()}>
                Lưu
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={dayDetailOpen}
        onOpenChange={(next) => {
          setDayDetailOpen(next)
          if (!next) setSelectedDayIso("")
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(720px,calc(100vw-24px))] max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-semibold">Chi tiết ngày</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {selectedDayMeta ? (
                    <>
                      <span className="font-medium">{format(parseISO(selectedDayMeta.iso), "dd/MM/yyyy")}</span>
                      {" · "}
                      Tổng: <span className="font-medium">{selectedDayMeta.total ? selectedDayMeta.total.toLocaleString("vi-VN") : "—"}</span>
                      {" · "}
                      Đã nhập: <span className="font-medium">{selectedDayMeta.filled}</span>/{flatRooms.length}
                    </>
                  ) : null}
                </div>
              </div>
              <Button variant="outline" size="xs" type="button" onClick={() => setDayDetailOpen(false)}>
                Đóng
              </Button>
            </div>

            <div className="mt-4 border bg-background max-h-[65vh] overflow-auto">
              <div className="divide-y">
                {flatRooms.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">Chưa có phòng.</div>
                ) : !selectedDayIso ? (
                  <div className="p-3 text-sm text-muted-foreground">Chọn ngày trong lịch để xem chi tiết.</div>
                ) : (
                  flatRooms.map((r) => {
                    const v = rateByRoomDate.get(`${r.id}:${selectedDayIso}`)
                    const meta = metaByRoomDate.get(`${r.id}:${selectedDayIso}`)
                    const branchName = branchId === "all" ? (branchNameById.get(r.branch_id) ?? "") : ""
                    const paymentLabel =
                      meta?.payment_status === "paid" ? "Đã thu" : meta?.payment_status === "partial" ? "Thu 1 phần" : meta ? "Chưa thu" : ""
                    const paymentCls =
                      meta?.payment_status === "paid"
                        ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                        : meta?.payment_status === "partial"
                          ? "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10"
                          : meta
                            ? "border-destructive/30 text-destructive bg-destructive/10"
                            : ""
                    return (
                      <div key={r.id} className="p-2 grid grid-cols-[1fr_auto] items-center gap-2">
                        <div className="min-w-0">
                          <div className="text-sm">
                            <span className="font-medium">{r.room_number}</span>{" "}
                            <span className="text-xs text-muted-foreground truncate">{r.room_type}</span>
                          </div>
                          {branchName || meta ? (
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {branchName ? <span className="text-[11px] border bg-muted/20 px-1.5 py-0.5">{branchName}</span> : null}
                              {meta?.guest_name ? <span className="text-[11px] border bg-muted/20 px-1.5 py-0.5">{meta.guest_name}</span> : null}
                              {meta?.guest_phone ? (
                                <span className="text-[11px] tabular-nums border bg-muted/20 px-1.5 py-0.5">{meta.guest_phone}</span>
                              ) : null}
                              {paymentLabel ? <span className={["text-[11px] border px-1.5 py-0.5", paymentCls].join(" ")}>{paymentLabel}</span> : null}
                              {meta?.note ? <span className="text-[11px] border bg-muted/20 px-1.5 py-0.5">Note</span> : null}
                            </div>
                          ) : null}
                        </div>
                        <div className="min-w-[140px]">
                          <button
                            type="button"
                            className={[
                              "w-full text-right border px-2 h-9 hover:bg-muted/40 tabular-nums",
                              typeof v === "number" ? "bg-muted/30" : "",
                            ].join(" ")}
                            onClick={() => {
                              openCellDialog(r.id, selectedDayIso)
                            }}
                            aria-label={`Nhập doanh thu phòng ${r.room_number} ngày ${selectedDayIso}`}
                            title="Bấm để nhập doanh thu"
                          >
                            {typeof v === "number" ? v.toLocaleString("vi-VN") : ""}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Mẹo: bấm vào từng phòng để nhập/sửa. Trong dialog nhập có nút <span className="font-medium">Xoá nhanh</span> khi cần.
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Doanh thu</div>
          <div className="text-sm text-muted-foreground">
            Bảng doanh thu theo ngày × phòng cho tất cả chi nhánh.
          </div>
        </div>
      </div>

      <div className="grid gap-3 border p-3 bg-card md:grid-cols-3">
        <label className="grid gap-1 text-xs">
          <div className="text-muted-foreground">Chi nhánh</div>
          <select
            className="h-9 border bg-background px-2 text-sm"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value as UUID | "all")}
            disabled={branchesLoading || branches.length === 0}
          >
            <option value="all">Tất cả</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <div className="text-muted-foreground">Tháng</div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-2">
            <input className="h-9 border bg-background px-2 text-sm" type="month" value={month} onChange={(e) => setMonthAndClampWeek(e.target.value)} />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                setMonthAndClampWeek(plusMonth(month, -1))
              }}
              title="Tháng trước"
            >
              ‹
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                setMonthAndClampWeek(plusMonth(month, +1))
              }}
              title="Tháng sau"
            >
              ›
            </Button>
          </div>
        </label>

        <div className="flex items-end justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv()} disabled={flatRooms.length === 0}>
            Xuất CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
            Nhập CSV
          </Button>
        </div>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      {metaError ? <div className="text-sm text-destructive">{metaError}</div> : null}

      <div className="grid gap-3">
        {/* Mobile: week view */}
        <div className="md:hidden border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium truncate">Theo tuần</div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  const a = parseISO(weekAnchorIso || range.from)
                  a.setDate(a.getDate() - 7)
                  setWeekAnchorIso(iso(a))
                  setMonthAndClampWeek(ym(a))
                }}
                title="Tuần trước"
              >
                ‹
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  const a = parseISO(weekAnchorIso || range.from)
                  a.setDate(a.getDate() + 7)
                  setWeekAnchorIso(iso(a))
                  setMonthAndClampWeek(ym(a))
                }}
                title="Tuần sau"
              >
                ›
              </Button>
            </div>
          </div>

          <div className="mt-2 border bg-background">
            <div className="divide-y">
              {weekDays.map((c) => {
                const t = dailyTotals.get(c.iso)
                const isSelected = selectedDayIso === c.iso
                return (
                  <button
                    key={c.iso}
                    type="button"
                    className={[
                      "w-full text-left p-2 grid grid-cols-[1fr_auto] items-center gap-2 hover:bg-muted/30",
                      c.inMonth ? "" : "opacity-40",
                      isSelected ? "bg-muted/20" : "",
                    ].join(" ")}
                    disabled={!c.inMonth || isLoading}
                    onClick={() => {
                      if (!c.inMonth) return
                      setSelectedDayIso(c.iso)
                      setDayDetailOpen(true)
                    }}
                    aria-label={c.inMonth ? `Mở chi tiết ngày ${c.iso}` : "Ngày ngoài tháng"}
                  >
                    <div className="min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-sm font-medium truncate">
                          {dayLabel(c.d)} <span className="tabular-nums">{format(c.d, "dd/MM")}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                          {t?.filled ? `${t.filled}/${flatRooms.length} phòng` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">{c.iso}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums">{t?.total ? t.total.toLocaleString("vi-VN") : ""}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Desktop/tablet: month grid */}
        <div className="hidden md:block border bg-card p-3">
          <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
            <div className="text-center">T2</div>
            <div className="text-center">T3</div>
            <div className="text-center">T4</div>
            <div className="text-center">T5</div>
            <div className="text-center">T6</div>
            <div className="text-center">T7</div>
            <div className="text-center">CN</div>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarCells.map((c) => {
              const t = dailyTotals.get(c.iso)
              return (
                <button
                  key={c.iso}
                  type="button"
                  className={[
                    "border bg-background hover:bg-muted/30 text-left p-2 min-h-[76px] grid gap-1",
                    c.inMonth ? "" : "opacity-40",
                  ].join(" ")}
                  disabled={!c.inMonth || isLoading}
                  title={c.inMonth ? `Ngày ${format(c.d, "dd/MM")}` : ""}
                  onClick={() => {
                    if (!c.inMonth) return
                    setSelectedDayIso(c.iso)
                    setDayDetailOpen(true)
                  }}
                  aria-label={c.inMonth ? `Mở chi tiết ngày ${c.iso}` : "Ngày ngoài tháng"}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-sm font-medium tabular-nums">{format(c.d, "d")}</div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">{t?.filled ? `${t.filled}/${flatRooms.length}` : ""}</div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{t?.total ? t.total.toLocaleString("vi-VN") : ""}</div>
                </button>
              )
            })}
          </div>

          {isLoading ? <div className="mt-3 text-sm text-muted-foreground">Đang tải...</div> : null}
          {!isLoading && flatRooms.length === 0 ? <div className="mt-3 text-sm text-muted-foreground">Chưa có phòng.</div> : null}
        </div>
      </div>
    </div>
  )
}

