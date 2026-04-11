import { endOfMonth, format, parseISO, startOfMonth } from "date-fns"
import { vi } from "date-fns/locale"
import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useBranches } from "@/hooks/useBranches"
import { useRates } from "@/hooks/useRates"
import { useRoomDayMeta } from "@/hooks/useRoomDayMeta"
import { useRooms } from "@/hooks/useRooms"
import type { Room, RoomStatus, UUID } from "@/lib/types"
import { cn } from "@/lib/utils"

function roomSortKey(roomNumber: string): number {
  const n = Number(roomNumber)
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY
}

function RoomEditDialog({
  open,
  onOpenChange,
  room,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: Room | null
  onUpdate: (input: Partial<Pick<Room, "room_number" | "room_type" | "status" | "notes">> & { id: UUID }) => Promise<void>
}) {
  const [roomNumber, setRoomNumber] = useState("")
  const [roomType, setRoomType] = useState("")
  const [status, setStatus] = useState<RoomStatus>("available")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open || !room) return
    setRoomNumber(room.room_number)
    setRoomType(room.room_type)
    setStatus(room.status)
    setNotes(room.notes ?? "")
    setError(null)
    setIsSaving(false)
  }, [open, room])

  async function onSubmit() {
    if (!room) return
    if (!roomNumber.trim()) {
      setError("Vui lòng nhập số phòng")
      return
    }
    if (!roomType.trim()) {
      setError("Vui lòng nhập loại phòng")
      return
    }
    setError(null)
    setIsSaving(true)
    try {
      await onUpdate({
        id: room.id,
        room_number: roomNumber.trim(),
        room_type: roomType.trim(),
        status,
        notes: notes.trim() || null,
      })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu phòng thất bại")
    } finally {
      setIsSaving(false)
    }
  }

  if (!room) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(640px,calc(100vw-24px))] sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Sửa phòng</DialogTitle>
          <DialogDescription>Số phòng, loại phòng, trạng thái, ghi chú.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1.5 text-xs md:col-span-2">
            <Label htmlFor="edit-room-number">Số phòng</Label>
            <Input id="edit-room-number" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
          </div>
          <div className="grid gap-1.5 text-xs md:col-span-2">
            <Label htmlFor="edit-room-type">Loại phòng</Label>
            <Input id="edit-room-type" value={roomType} onChange={(e) => setRoomType(e.target.value)} />
          </div>
          <div className="grid gap-1.5 text-xs md:col-span-2">
            <Label>Trạng thái phòng</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as RoomStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v) =>
                    v === "available"
                      ? "Trống"
                      : v === "occupied"
                        ? "Đang ở"
                        : v === "maintenance"
                          ? "Bảo trì"
                          : String(v ?? "")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Trống</SelectItem>
                <SelectItem value="occupied">Đang ở</SelectItem>
                <SelectItem value="maintenance">Bảo trì</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 text-xs md:col-span-2">
            <Label htmlFor="edit-room-notes">Ghi chú</Label>
            <Textarea id="edit-room-notes" className="min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {error ? <div className="text-xs text-destructive">{error}</div> : null}

        <DialogFooter>
          <Button variant="outline" type="button" disabled={isSaving} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" disabled={isSaving} onClick={() => void onSubmit()}>
            {isSaving ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type StatusFilter = "all" | RoomStatus

export function RoomsPage() {
  const { branches, isLoading: branchesLoading } = useBranches()
  const [branchId, setBranchId] = useState<UUID | "all">("all")
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()))
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const [editOpen, setEditOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  const {
    rooms,
    isLoading: roomsLoading,
    error: roomsError,
    updateRoom,
    refresh: refreshRooms,
  } = useRooms(branchId)
  const monthRange = useMemo(() => {
    const from = format(startOfMonth(displayMonth), "yyyy-MM-dd")
    const to = format(endOfMonth(displayMonth), "yyyy-MM-dd")
    return { from, to }
  }, [displayMonth])

  const {
    rates: dayRates,
    isLoading: dayRatesLoading,
    error: dayRatesError,
    refresh: refreshDayRates,
  } = useRates({ branchId, from: selectedDate, to: selectedDate })
  const {
    rates: monthRates,
    isLoading: monthRatesLoading,
    error: monthRatesError,
    refresh: refreshMonthRates,
  } = useRates({ branchId, from: monthRange.from, to: monthRange.to })
  const {
    metas,
    isLoading: metaLoading,
    error: metaError,
    upsertMeta,
    deleteMeta,
    refresh: refreshMeta,
  } = useRoomDayMeta({ branchId, from: selectedDate, to: selectedDate })

  const isLoading = branchesLoading || roomsLoading || dayRatesLoading || monthRatesLoading || metaLoading
  const loadError = roomsError || dayRatesError || monthRatesError || metaError

  const branchNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const b of branches) m.set(b.id, b.name)
    return m
  }, [branches])

  const rateByRoomDate = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of dayRates) m.set(`${r.room_id}:${r.date}`, Number(r.price))
    return m
  }, [dayRates])

  const daysWithRevenue = useMemo(() => {
    const totals = new Map<string, number>()
    for (const r of monthRates) {
      const p = Number(r.price || 0)
      if (!p) continue
      totals.set(r.date, (totals.get(r.date) ?? 0) + p)
    }
    const set = new Set<string>()
    for (const [d, total] of totals) {
      if (total > 0) set.add(d)
    }
    return set
  }, [monthRates])

  const metaByRoomDate = useMemo(() => {
    const m = new Map<string, (typeof metas)[number]>()
    for (const x of metas) m.set(`${x.room_id}:${x.date}`, x)
    return m
  }, [metas])

  const selectedBranches = useMemo(() => {
    if (branchId === "all") return branches
    return branches.filter((b) => b.id === branchId)
  }, [branches, branchId])

  const roomsByBranchOrder = useMemo(() => {
    const m = new Map<string, Room[]>()
    for (const b of selectedBranches) {
      const rs = rooms
        .filter((r) => r.branch_id === b.id)
        .slice()
        .sort((a, b2) => roomSortKey(a.room_number) - roomSortKey(b2.room_number))
      m.set(b.id, rs)
    }
    return m
  }, [rooms, selectedBranches])

  const flatRooms = useMemo(() => {
    const acc: Room[] = []
    for (const b of selectedBranches) {
      acc.push(...(roomsByBranchOrder.get(b.id) ?? []))
    }
    return acc
  }, [roomsByBranchOrder, selectedBranches])

  const filteredRooms = useMemo(() => {
    if (statusFilter === "all") return flatRooms
    return flatRooms.filter((r) => r.status === statusFilter)
  }, [flatRooms, statusFilter])

  const summary = useMemo(() => {
    let occupied = 0
    let empty = 0
    let maintenance = 0
    let notCleaned = 0
    let notPaid = 0

    for (const r of filteredRooms) {
      if (r.status === "occupied") occupied += 1
      else if (r.status === "available") empty += 1
      else maintenance += 1

      const price = rateByRoomDate.get(`${r.id}:${selectedDate}`)
      const meta = metaByRoomDate.get(`${r.id}:${selectedDate}`)
      const hasRevenue = typeof price === "number" && price > 0
      const hasGuest = Boolean(meta?.guest_name?.trim() || meta?.guest_phone?.trim())
      const hasActivity = hasRevenue || hasGuest
      const cleaned = meta?.cleaned === true
      if (hasActivity && !cleaned) notCleaned += 1

      const pay = meta?.payment_status ?? "unpaid"
      if (hasRevenue && pay === "unpaid") notPaid += 1
    }

    return {
      total: filteredRooms.length,
      occupied,
      empty,
      maintenance,
      notCleaned,
      notPaid,
    }
  }, [filteredRooms, rateByRoomDate, metaByRoomDate, selectedDate])

  function openEdit(r: Room) {
    setEditingRoom(r)
    setEditOpen(true)
  }

  async function persistMetaForRoom(
    room: Room,
    patch: {
      cleaned?: boolean
      paymentStatus?: "unpaid" | "paid" | "partial"
    }
  ) {
    const meta = metaByRoomDate.get(`${room.id}:${selectedDate}`)
    const guestName = meta?.guest_name?.trim() || null
    const guestPhone = meta?.guest_phone?.trim() || null
    const note = meta?.note?.trim() || null
    const paymentStatus = patch.paymentStatus ?? meta?.payment_status ?? "unpaid"
    const cleaned = patch.cleaned ?? meta?.cleaned ?? false

    const hasMeta = Boolean(
      guestName || guestPhone || note || paymentStatus !== "unpaid" || cleaned
    )
    if (!hasMeta) {
      await deleteMeta({ roomId: room.id, date: selectedDate })
    } else {
      await upsertMeta({
        branchId: room.branch_id as UUID,
        roomId: room.id,
        date: selectedDate,
        guestName,
        guestPhone,
        paymentStatus,
        note,
        cleaned,
      })
    }
  }

  async function onToggleCleaned(room: Room, cleaned: boolean) {
    await persistMetaForRoom(room, { cleaned })
  }

  async function onPaymentChange(room: Room, paymentStatus: "unpaid" | "paid" | "partial") {
    await persistMetaForRoom(room, { paymentStatus })
  }

  const todayIso = format(new Date(), "yyyy-MM-dd")

  return (
    <div className="grid gap-2 sm:gap-3">
      <RoomEditDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o)
          if (!o) setEditingRoom(null)
        }}
        room={editingRoom}
        onUpdate={updateRoom}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <div className="text-base font-semibold leading-tight sm:text-lg">Quản lý phòng</div>
          <div className="text-xs text-muted-foreground leading-snug sm:text-sm">
            Tình trạng check-in, dọn phòng, thu tiền theo ngày — chỉnh sửa nhanh từng phòng.
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => {
            void refreshRooms()
            void refreshDayRates()
            void refreshMonthRates()
            void refreshMeta()
          }}
        >
          Làm mới
        </Button>
      </div>

      <Card size="sm">
        <CardContent className="py-3 sm:py-3.5">
          {/* Mobile: lịch full width + ô lớn. Desktop: full width — lọc giãn trái, lịch gọn căn phải (tránh cụm giữa hai bên trống) */}
          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-6 lg:gap-8">
            <div className="min-w-0 space-y-2">
              <div className="grid w-full max-w-full gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5 text-xs min-w-0">
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

                <div className="grid gap-1.5 text-xs min-w-0">
                  <Label>Lọc trạng thái phòng</Label>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(v) =>
                          v === "all"
                            ? "Tất cả"
                            : v === "available"
                              ? "Trống"
                              : v === "occupied"
                                ? "Đang ở"
                                : v === "maintenance"
                                  ? "Bảo trì"
                                  : String(v ?? "")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="available">Trống</SelectItem>
                      <SelectItem value="occupied">Đang ở</SelectItem>
                      <SelectItem value="maintenance">Bảo trì</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="hidden text-xs text-muted-foreground md:block">
                Đang xem ngày{" "}
                <span className="font-medium text-foreground tabular-nums">{selectedDate}</span>
                {selectedDate === todayIso ? " · Hôm nay" : null}
              </p>
            </div>

            <div className="grid w-full shrink-0 gap-1.5 text-xs md:w-auto md:justify-self-end">
              <Label className="text-center md:text-right">Chọn ngày</Label>
              <div className="flex w-full justify-center overflow-x-auto rounded-lg border border-border/70 bg-muted/20 p-2 md:w-fit md:justify-end md:p-1.5">
                <Calendar
                  mode="single"
                  locale={vi}
                  month={displayMonth}
                  onMonthChange={(m) => setDisplayMonth(m)}
                  selected={parseISO(selectedDate)}
                  onSelect={(d) => {
                    if (!d) return
                    setSelectedDate(format(d, "yyyy-MM-dd"))
                    setDisplayMonth(startOfMonth(d))
                  }}
                  modifiers={{
                    hasRevenue: (date) => daysWithRevenue.has(format(date, "yyyy-MM-dd")),
                  }}
                  modifiersClassNames={{
                    hasRevenue: "has-revenue-dot",
                  }}
                  className={cn(
                    "p-0",
                    /* Mobile: full width, ô lớn dễ bấm. Desktop: lịch nhỏ gọn, không chiếm dọc quá nhiều */
                    "w-full max-w-full md:w-fit md:max-w-none",
                    "[--cell-size:min(3rem,calc((100vw-2.25rem)/7))] md:[--cell-size:1.875rem] lg:[--cell-size:1.8125rem]",
                  )}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadError ? <div className="text-sm text-destructive">{loadError}</div> : null}

      <div className="flex flex-wrap gap-2 text-[11px]">
        <Badge variant="outline" className="border-border bg-muted/30">
          <strong className="tabular-nums">{summary.total}</strong> phòng
        </Badge>
        <Badge variant="outline" className="border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
          <strong className="tabular-nums">{summary.occupied}</strong> đang ở
        </Badge>
        <Badge variant="outline" className="border-muted-foreground/25 bg-muted/30">
          <strong className="tabular-nums">{summary.empty}</strong> trống
        </Badge>
        {summary.maintenance > 0 ? (
          <Badge variant="outline" className="border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200">
            <strong className="tabular-nums">{summary.maintenance}</strong> bảo trì
          </Badge>
        ) : null}
        <Badge variant="outline" className="border-sky-500/35 bg-sky-500/10 text-sky-800 dark:text-sky-300">
          <strong className="tabular-nums">{summary.notCleaned}</strong> chưa dọn
        </Badge>
        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
          <strong className="tabular-nums">{summary.notPaid}</strong> chưa thu tiền
        </Badge>
      </div>

      {isLoading ? <div className="text-sm text-muted-foreground">Đang tải...</div> : null}

      {!isLoading && filteredRooms.length === 0 ? (
        <Card size="sm">
          <CardContent className="py-3 text-sm text-muted-foreground">Không có phòng phù hợp bộ lọc.</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 sm:gap-2.5 xl:grid-cols-3">
        {!isLoading &&
          filteredRooms.map((r) => {
            const price = rateByRoomDate.get(`${r.id}:${selectedDate}`)
            const meta = metaByRoomDate.get(`${r.id}:${selectedDate}`)
            const hasRevenue = typeof price === "number" && price > 0
            const guestName = meta?.guest_name?.trim()
            const guestPhone = meta?.guest_phone?.trim()
            const hasGuest = Boolean(guestName || guestPhone)
            const checkIn = hasRevenue || hasGuest
            const isCleaned = meta?.cleaned === true
            const branchName = branchId === "all" ? (branchNameById.get(r.branch_id) ?? "") : ""

            const statusBadge =
              r.status === "available"
                ? { label: "Trống", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" }
                : r.status === "occupied"
                  ? { label: "Đang ở", cls: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200" }
                  : { label: "Bảo trì", cls: "border-destructive/35 bg-destructive/10 text-destructive" }

            const paymentValue = meta?.payment_status ?? "unpaid"

            return (
              <Card key={r.id} size="sm" className="rounded-md">
                <CardHeader className="pb-1.5 pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-sm font-semibold tabular-nums">Phòng {r.room_number}</CardTitle>
                        <span className="text-xs text-muted-foreground truncate">{r.room_type}</span>
                        {branchName ? (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {branchName}
                          </Badge>
                        ) : null}
                      </div>
                      <Badge variant="outline" className={cn("mt-1 text-[10px] font-medium", statusBadge.cls)}>
                        {statusBadge.label}
                      </Badge>
                    </div>
                    <Button variant="outline" size="xs" type="button" onClick={() => openEdit(r)}>
                      Sửa
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-2 pt-0 pb-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-medium",
                        checkIn
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                          : "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
                      )}
                    >
                      {checkIn ? "Có khách / đặt" : "Chưa check-in"}
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
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        paymentValue === "paid"
                          ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                          : paymentValue === "partial"
                            ? "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10"
                            : meta
                              ? "border-destructive/30 text-destructive bg-destructive/10"
                              : "border-muted-foreground/25 text-muted-foreground bg-muted/30",
                      )}
                    >
                      {paymentValue === "paid" ? "Đã thu" : paymentValue === "partial" ? "Thu một phần" : meta ? "Chưa thu" : "—"}
                    </Badge>
                  </div>

                  {guestName || guestPhone ? (
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {guestName ? <Badge variant="outline">{guestName}</Badge> : null}
                      {guestPhone ? (
                        <Badge variant="outline" className="tabular-nums">
                          {guestPhone}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="text-sm tabular-nums">
                    {hasRevenue ? (
                      <span className="font-medium">{price!.toLocaleString("vi-VN")} đ</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Chưa có doanh thu ngày này</span>
                    )}
                  </div>

                  {meta?.note ? (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 border-l-2 border-muted pl-2">{meta.note}</p>
                  ) : null}

                  <div className="grid gap-2 sm:grid-cols-2 sm:items-end border-t pt-2">
                    <div className="flex items-center gap-2 text-[11px]">
                      <Checkbox
                        id={`cleaned-${r.id}`}
                        checked={isCleaned}
                        onCheckedChange={(c) => void onToggleCleaned(r, c === true)}
                        aria-label={`Đánh dấu đã dọn phòng ${r.room_number}`}
                      />
                      <Label htmlFor={`cleaned-${r.id}`} className="cursor-pointer text-muted-foreground font-normal">
                        Đã dọn phòng
                      </Label>
                    </div>

                    <div className="grid gap-1.5 text-[11px]">
                      <Label>Thu tiền</Label>
                      <Select
                        value={paymentValue}
                        onValueChange={(v) => void onPaymentChange(r, v as "unpaid" | "paid" | "partial")}
                      >
                        <SelectTrigger className="w-full h-9">
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

                  <CardFooter className="px-0 pb-0 pt-0 border-0">
                    {selectedDate === todayIso ? (
                      <div className="text-[10px] text-muted-foreground">Hôm nay · {selectedDate}</div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground tabular-nums">{selectedDate}</div>
                    )}
                  </CardFooter>
                </CardContent>
              </Card>
            )
          })}
      </div>

      <div className="text-[11px] text-muted-foreground border-t pt-1.5 leading-snug">
        Check-in = có khách hoặc đã nhập doanh thu ngày đó. Đánh dấu dọn / thu tiền lưu vào dữ liệu ngày đã chọn.{" "}
        <button
          type="button"
          className="underline underline-offset-2 hover:text-foreground"
          onClick={() => {
            void refreshDayRates()
            void refreshMonthRates()
            void refreshMeta()
          }}
        >
          Tải lại doanh thu
        </button>
      </div>
    </div>
  )
}
