import { eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth } from "date-fns"
import { useMemo, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useBranches } from "@/hooks/useBranches"
import { useRooms } from "@/hooks/useRooms"
import { useRates } from "@/hooks/useRates"
import { useRoomDayMeta } from "@/hooks/useRoomDayMeta"
import type { UUID } from "@/lib/types"
import { cn } from "@/lib/utils"

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

function plusMonth(month: string, delta: number) {
  const [yStr, mStr] = month.split("-")
  const d = new Date(Number(yStr), Number(mStr) - 1 + delta, 1)
  return ym(d)
}

export function RatesPage() {
  const { branches, isLoading: branchesLoading } = useBranches()
  const [branchId, setBranchId] = useState<UUID | "all">("all")
  const [month, setMonth] = useState(() => ym(new Date()))

  const [cellDialogOpen, setCellDialogOpen] = useState(false)
  const [cellDialogRoomId, setCellDialogRoomId] = useState<UUID | null>(null)
  const [cellDialogDate, setCellDialogDate] = useState<string>("")
  const [cellDialogValue, setCellDialogValue] = useState("")
  const [cellDialogGuestName, setCellDialogGuestName] = useState("")
  const [cellDialogGuestPhone, setCellDialogGuestPhone] = useState("")
  const [cellDialogPaymentStatus, setCellDialogPaymentStatus] = useState<"unpaid" | "paid" | "partial">("unpaid")
  const [cellDialogNote, setCellDialogNote] = useState("")
  const [cellDialogCleaned, setCellDialogCleaned] = useState(false)

  const [dayDetailOpen, setDayDetailOpen] = useState(false)
  const [selectedDayIso, setSelectedDayIso] = useState<string>("")

  const { rooms } = useRooms(branchId === "all" ? "all" : branchId)

  const range = useMemo(() => monthRange(month), [month])

  const todayIso = format(new Date(), "yyyy-MM-dd")

  const { rates, isLoading, error, upsertRate, deleteRate } = useRates({
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
    setCellDialogCleaned(meta?.cleaned === true)
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
    const hasMeta = Boolean(
      guestName || guestPhone || note || cellDialogPaymentStatus !== "unpaid" || cellDialogCleaned
    )
    if (hasMeta) {
      await upsertMeta({
        branchId: room.branch_id as UUID,
        roomId: cellDialogRoomId,
        date: cellDialogDate,
        guestName,
        guestPhone,
        paymentStatus: cellDialogPaymentStatus,
        note,
        cleaned: cellDialogCleaned,
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
    const start = parseISO(range.from)
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1)
    const monthIndex = monthStart.getMonth()
    const mondayIndex = (monthStart.getDay() + 6) % 7
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

  const selectedDayMeta = useMemo(() => {
    if (!selectedDayIso) return null
    const t = dailyTotals.get(selectedDayIso) ?? { total: 0, filled: 0 }
    return { ...t, iso: selectedDayIso }
  }, [dailyTotals, selectedDayIso])

  const selectedDaySummary = useMemo(() => {
    if (!selectedDayIso || flatRooms.length === 0) return null
    let booked = 0
    let cleaned = 0
    for (const r of flatRooms) {
      const v = rateByRoomDate.get(`${r.id}:${selectedDayIso}`)
      const meta = metaByRoomDate.get(`${r.id}:${selectedDayIso}`)
      if (typeof v === "number" && v > 0) booked += 1
      if (meta?.cleaned === true) cleaned += 1
    }
    const n = flatRooms.length
    return {
      booked,
      notBooked: n - booked,
      cleaned,
      notCleaned: n - cleaned,
    }
  }, [selectedDayIso, flatRooms, rateByRoomDate, metaByRoomDate])

  async function setRoomCleanedFlag(roomId: UUID, date: string, cleaned: boolean) {
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return
    const meta = metaByRoomDate.get(`${roomId}:${date}`)
    const guestName = meta?.guest_name?.trim() || null
    const guestPhone = meta?.guest_phone?.trim() || null
    const note = meta?.note?.trim() || null
    const paymentStatus = meta?.payment_status ?? "unpaid"
    const hasMeta = Boolean(guestName || guestPhone || note || paymentStatus !== "unpaid" || cleaned)
    if (!hasMeta) {
      await deleteMeta({ roomId, date })
    } else {
      await upsertMeta({
        branchId: room.branch_id as UUID,
        roomId,
        date,
        guestName,
        guestPhone,
        paymentStatus,
        note,
        cleaned,
      })
    }
  }

  return (
    <div className="grid gap-2 sm:gap-3">
      <Dialog
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
            setCellDialogCleaned(false)
          }
        }}
      >
        <DialogContent className="max-w-[min(520px,calc(100vw-24px))] sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Nhập doanh thu</DialogTitle>
            <DialogDescription>
              {cellDialogRoomId && cellDialogDate ? (
                <>
                  Phòng <span className="font-medium text-foreground">{rooms.find((r) => r.id === cellDialogRoomId)?.room_number ?? ""}</span>{" "}
                  - <span className="font-medium text-foreground">{cellDialogDate}</span>
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <div className="grid gap-1.5 text-xs">
              <Label htmlFor="cell-amount">Số tiền (để trống để xoá)</Label>
              <Input
                id="cell-amount"
                className="tabular-nums"
                inputMode="numeric"
                autoFocus
                value={cellDialogValue}
                onChange={(e) => setCellDialogValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setCellDialogOpen(false)
                  if (e.key === "Enter") void commitCellDialog()
                }}
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-1.5 text-xs">
                <Label htmlFor="cell-guest">Tên khách</Label>
                <Input
                  id="cell-guest"
                  placeholder="Ví dụ: Anh A"
                  value={cellDialogGuestName}
                  onChange={(e) => setCellDialogGuestName(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5 text-xs">
                <Label htmlFor="cell-phone">SĐT khách</Label>
                <Input
                  id="cell-phone"
                  className="tabular-nums"
                  inputMode="tel"
                  placeholder="Ví dụ: 090..."
                  value={cellDialogGuestPhone}
                  onChange={(e) => setCellDialogGuestPhone(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5 text-xs md:col-span-2">
                <Label>Thanh toán</Label>
                <Select
                  value={cellDialogPaymentStatus}
                  onValueChange={(v) => setCellDialogPaymentStatus(v as "unpaid" | "paid" | "partial")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v) =>
                        v === "unpaid"
                          ? "Chưa thu"
                          : v === "partial"
                            ? "Thu một phần"
                            : v === "paid"
                              ? "Đã thu"
                              : String(v ?? "")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Chưa thu</SelectItem>
                    <SelectItem value="partial">Thu một phần</SelectItem>
                    <SelectItem value="paid">Đã thu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5 text-xs">
              <Label htmlFor="cell-note">Ghi chú</Label>
              <Textarea
                id="cell-note"
                className="min-h-20"
                value={cellDialogNote}
                onChange={(e) => setCellDialogNote(e.target.value)}
                placeholder="Ví dụ: Khách chuyển khoản, xuất hoá đơn..."
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Checkbox
                id="cell-cleaned"
                checked={cellDialogCleaned}
                onCheckedChange={(c) => setCellDialogCleaned(c === true)}
              />
              <Label htmlFor="cell-cleaned" className="font-normal cursor-pointer">
                Đã dọn phòng
              </Label>
            </div>
          </div>

          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dayDetailOpen}
        onOpenChange={(next) => {
          setDayDetailOpen(next)
          if (!next) setSelectedDayIso("")
        }}
      >
        <DialogContent className="max-w-[min(720px,calc(100vw-24px))] sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết ngày</DialogTitle>
            <DialogDescription className="tabular-nums">
              {selectedDayMeta ? (
                <>
                  <span className="font-medium text-foreground">{format(parseISO(selectedDayMeta.iso), "dd/MM/yyyy")}</span>
                  {" · "}
                  Tổng:{" "}
                  <span className="font-medium">{selectedDayMeta.total ? selectedDayMeta.total.toLocaleString("vi-VN") : "—"}</span>
                  {" · "}
                  Đã nhập doanh thu:{" "}
                  <span className="font-medium">{selectedDayMeta.filled}</span>/{flatRooms.length}
                </>
              ) : null}
            </DialogDescription>
            {selectedDaySummary ? (
              <div className="flex flex-wrap gap-2 text-[11px] pt-2">
                <Badge variant="outline" className="border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                  Đã đặt: <strong className="tabular-nums">{selectedDaySummary.booked}</strong>
                </Badge>
                <Badge variant="outline" className="border-muted-foreground/25 bg-muted/30">
                  Chưa đặt: <strong className="tabular-nums">{selectedDaySummary.notBooked}</strong>
                </Badge>
                <Badge variant="outline" className="border-sky-500/35 bg-sky-500/10 text-sky-800 dark:text-sky-300">
                  Đã dọn: <strong className="tabular-nums">{selectedDaySummary.cleaned}</strong>
                </Badge>
                <Badge variant="outline" className="border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                  Chưa dọn: <strong className="tabular-nums">{selectedDaySummary.notCleaned}</strong>
                </Badge>
              </div>
            ) : null}
          </DialogHeader>

          <ScrollArea className="h-[min(65vh,520px)] border bg-background rounded-md">
            <div className="divide-y pr-3">
              {flatRooms.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">Chưa có phòng.</div>
              ) : !selectedDayIso ? (
                <div className="p-3 text-sm text-muted-foreground">Chọn ngày trong lịch để xem chi tiết.</div>
              ) : (
                flatRooms.map((r) => {
                  const v = rateByRoomDate.get(`${r.id}:${selectedDayIso}`)
                  const meta = metaByRoomDate.get(`${r.id}:${selectedDayIso}`)
                  const branchName = branchId === "all" ? (branchNameById.get(r.branch_id) ?? "") : ""
                  const isBooked = typeof v === "number" && v > 0
                  const isCleaned = meta?.cleaned === true
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
                    <div
                      key={r.id}
                      className={cn(
                        "p-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start",
                        isBooked ? "bg-emerald-500/4" : "bg-muted/5",
                      )}
                    >
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{r.room_number}</span>
                          <span className="text-xs text-muted-foreground truncate">{r.room_type}</span>
                          {branchName ? (
                            <Badge variant="outline" className="text-[10px]">
                              {branchName}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-medium",
                              isBooked
                                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                                : "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
                            )}
                          >
                            {isBooked ? "Đã đặt" : "Chưa đặt"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-medium",
                              isCleaned
                                ? "border-sky-500/40 bg-sky-500/15 text-sky-800 dark:text-sky-300"
                                : "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200",
                            )}
                          >
                            {isCleaned ? "Đã dọn" : "Chưa dọn"}
                          </Badge>
                          {paymentLabel ? (
                            <Badge variant="outline" className={cn("text-[10px]", paymentCls)}>
                              {paymentLabel}
                            </Badge>
                          ) : null}
                        </div>
                        {meta?.guest_name || meta?.guest_phone ? (
                          <div className="flex flex-wrap gap-1.5 text-[11px]">
                            {meta?.guest_name ? <Badge variant="outline">{meta.guest_name}</Badge> : null}
                            {meta?.guest_phone ? (
                              <Badge variant="outline" className="tabular-nums">
                                {meta.guest_phone}
                              </Badge>
                            ) : null}
                          </div>
                        ) : null}
                        {meta?.note ? (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 border-l-2 border-muted pl-2">{meta.note}</p>
                        ) : null}
                        <div className="inline-flex items-center gap-2 text-[11px]">
                          <Checkbox
                            id={`day-cleaned-${r.id}`}
                            className="shrink-0"
                            checked={isCleaned}
                            onCheckedChange={(c) => void setRoomCleanedFlag(r.id, selectedDayIso, c === true)}
                            aria-label={`Đánh dấu đã dọn phòng ${r.room_number}`}
                          />
                          <Label htmlFor={`day-cleaned-${r.id}`} className="text-muted-foreground font-normal cursor-pointer">
                            Đánh dấu đã dọn
                          </Label>
                        </div>
                      </div>
                      <div className="min-w-[min(100%,9rem)] sm:text-right">
                        <button
                          type="button"
                          className={cn(
                            "w-full sm:w-36 text-right border rounded-md px-3 py-2 text-sm font-medium tabular-nums transition-colors hover:bg-muted/50",
                            isBooked ? "border-emerald-500/30 bg-emerald-500/10" : "border-dashed text-muted-foreground",
                          )}
                          onClick={() => {
                            openCellDialog(r.id, selectedDayIso)
                          }}
                          aria-label={`Nhập doanh thu phòng ${r.room_number} ngày ${selectedDayIso}`}
                        >
                          {typeof v === "number" && v > 0 ? (
                            <span className="text-foreground">{v.toLocaleString("vi-VN")} đ</span>
                          ) : (
                            <span className="text-xs font-normal">+ Nhập doanh thu</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>

          <p className="text-xs text-muted-foreground">
            Đặt = đã nhập doanh thu ngày đó. Dọn = trạng thái dọn phòng. Bấm ô tiền để sửa đầy đủ (khách, thanh toán, ghi chú).
          </p>
        </DialogContent>
      </Dialog>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <div className="text-base font-semibold leading-tight sm:text-lg">Doanh thu</div>
          <div className="text-xs text-muted-foreground leading-snug sm:text-sm">
            Bảng doanh thu theo ngày × phòng cho tất cả chi nhánh.
          </div>
        </div>
      </div>

      <Card size="sm">
        <CardContent className="py-3 grid gap-2 md:grid-cols-2">
          <div className="grid gap-1.5 text-xs">
            <Label>Chi nhánh</Label>
            <Select
              value={branchId}
              onValueChange={(v) => setBranchId(v as UUID | "all")}
              disabled={branchesLoading || branches.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) =>
                    value === "all"
                      ? "Tất cả"
                      : branches.find((b) => b.id === value)?.name ?? String(value ?? "")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5 text-xs">
            <Label htmlFor="rates-month">Tháng</Label>
            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
              <Input id="rates-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setMonth(plusMonth(month, -1))
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
                  setMonth(plusMonth(month, +1))
                }}
                title="Tháng sau"
              >
                ›
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {metaError ? (
        <Alert variant="destructive">
          <AlertDescription>{metaError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3">
        {/* Mobile: danh sách ngày trong tháng — dọc, dễ cuộn */}
        <div className="md:hidden border bg-card p-3">
          <div className="text-sm font-medium">Lịch tháng</div>
          <div className="mt-2 border bg-background divide-y rounded-sm overflow-hidden">
            {days.map((d) => {
              const dateIso = format(d, "yyyy-MM-dd")
              const t = dailyTotals.get(dateIso)
              const isSelected = selectedDayIso === dateIso
              const isToday = dateIso === todayIso
              return (
                <button
                  key={dateIso}
                  type="button"
                  className={[
                    "w-full text-left p-2.5 grid grid-cols-[1fr_auto] items-center gap-2 hover:bg-muted/30 min-h-11",
                    isSelected ? "bg-muted/20" : "",
                    isToday ? "border-l-4 border-l-primary bg-primary/5" : "",
                  ].join(" ")}
                  disabled={isLoading}
                  onClick={() => {
                    setSelectedDayIso(dateIso)
                    setDayDetailOpen(true)
                  }}
                  aria-label={`Mở chi tiết ngày ${dateIso}${isToday ? " (hôm nay)" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <div className="text-sm font-medium truncate">
                        {dayLabel(d)} <span className="tabular-nums">{format(d, "dd/MM")}</span>
                        {isToday ? (
                          <span className="ml-2 inline-flex items-center rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                            Hôm nay
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                        {t?.filled ? `${t.filled}/${flatRooms.length} phòng` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">{dateIso}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">{t?.total ? t.total.toLocaleString("vi-VN") : ""}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {isLoading ? <div className="mt-3 text-sm text-muted-foreground">Đang tải...</div> : null}
          {!isLoading && flatRooms.length === 0 ? <div className="mt-3 text-sm text-muted-foreground">Chưa có phòng.</div> : null}
        </div>

        {/* Desktop/tablet: lưới tháng trực quan */}
        <div className="hidden md:block border bg-card p-3">
          <div className="text-sm font-medium">Lịch tháng</div>
          <div className="mt-2 grid grid-cols-7 gap-2 text-xs text-muted-foreground">
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
              const isSelected = selectedDayIso === c.iso
              const isToday = c.iso === todayIso && c.inMonth
              return (
                <button
                  key={c.iso}
                  type="button"
                  className={[
                    "border bg-background hover:bg-muted/30 text-left p-2 min-h-[76px] grid gap-1 rounded-sm",
                    c.inMonth ? "" : "opacity-40",
                    isToday ? "ring-2 ring-primary/55 bg-primary/5" : isSelected ? "ring-2 ring-ring/50 bg-muted/15" : "",
                  ].join(" ")}
                  disabled={!c.inMonth || isLoading}
                  title={c.inMonth ? `Ngày ${format(c.d, "dd/MM")}${isToday ? " · Hôm nay" : ""}` : ""}
                  onClick={() => {
                    if (!c.inMonth) return
                    setSelectedDayIso(c.iso)
                    setDayDetailOpen(true)
                  }}
                  aria-label={c.inMonth ? `Mở chi tiết ngày ${c.iso}${isToday ? " (hôm nay)" : ""}` : "Ngày ngoài tháng"}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-sm font-medium tabular-nums">{format(c.d, "d")}</div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">{t?.filled ? `${t.filled}/${flatRooms.length}` : ""}</div>
                  </div>
                  {isToday ? <div className="text-[9px] font-medium text-primary">Hôm nay</div> : null}
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

