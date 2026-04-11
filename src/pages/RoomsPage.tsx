import { endOfMonth, format, isValid, parseISO, startOfMonth } from "date-fns"
import { vi } from "date-fns/locale"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { BookingDialog } from "@/components/booking/BookingDialog"
import { Badge, badgeVariants } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { useBookings } from "@/hooks/useBookings"
import { useBranches } from "@/hooks/useBranches"
import { useRates } from "@/hooks/useRates"
import { useRoomDayMeta } from "@/hooks/useRoomDayMeta"
import { useRooms } from "@/hooks/useRooms"
import { getRoomIdsBookedOnDate, type CreateBookingInput } from "@/lib/bookings"
import type { Room, RoomDayMeta, RoomStatus, UUID } from "@/lib/types"
import { cn } from "@/lib/utils"

function roomSortKey(roomNumber: string): number {
  const n = Number(roomNumber)
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY
}

/** Hiển thị giờ + ngày cho timestamp ISO từ DB. */
function formatMetaDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = parseISO(iso)
  if (!isValid(d)) return null
  return format(d, "HH:mm · dd/MM/yyyy")
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

/** Lọc theo meta + doanh thu ngày đang xem (khớp badge chính trên thẻ phòng). */
type DayOpsFilter = "all" | "needs_clean" | "in_stay" | "empty_day" | "unpaid"

/** Badge tổng hợp: bấm để bật/tắt cùng bộ lọc với Select phía trên. */
type SummaryBadgeId = "total" | "occupied" | "empty" | "maintenance" | "needs_clean" | "unpaid"

function SummaryFilterBadge({
  active,
  onClick,
  className,
  children,
}: {
  active: boolean
  onClick: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        badgeVariants({ variant: "outline" }),
        "h-auto min-h-5 cursor-pointer select-none text-[11px] font-medium transition-shadow",
        active && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        className
      )}
    >
      {children}
    </button>
  )
}

function matchesDayOpsFilter(
  r: Room,
  selectedDate: string,
  rateByRoomDate: Map<string, number>,
  metaByRoomDate: Map<string, RoomDayMeta>,
  filter: DayOpsFilter
): boolean {
  if (filter === "all") return true
  const price = rateByRoomDate.get(`${r.id}:${selectedDate}`)
  const meta = metaByRoomDate.get(`${r.id}:${selectedDate}`)
  const hasRevenue = typeof price === "number" && price > 0
  const hasGuest = Boolean(meta?.guest_name?.trim() || meta?.guest_phone?.trim())
  const implicitInRoom = hasRevenue || hasGuest
  const checkedOut = meta?.checked_out === true
  const isCleaned = meta?.cleaned === true
  const hasCheckedInTs = Boolean(meta?.checked_in_at)
  const pay = meta?.payment_status ?? "unpaid"

  switch (filter) {
    case "needs_clean":
      return r.status !== "maintenance" && checkedOut && !isCleaned
    case "in_stay":
      return r.status !== "maintenance" && !checkedOut && (hasCheckedInTs || implicitInRoom)
    case "empty_day":
      return r.status !== "maintenance" && !checkedOut && !hasCheckedInTs && !implicitInRoom
    case "unpaid":
      return hasRevenue && pay === "unpaid"
    default:
      return true
  }
}

export function RoomsPage() {
  const { branches, isLoading: branchesLoading } = useBranches()
  const [branchId, setBranchId] = useState<UUID | "all">("all")
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()))
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [roomQuery, setRoomQuery] = useState("")
  const [dayOpsFilter, setDayOpsFilter] = useState<DayOpsFilter>("all")

  const [editOpen, setEditOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  const { createBooking: createBookingHook } = useBookings()
  const [checkInPromptRoom, setCheckInPromptRoom] = useState<Room | null>(null)
  const [checkInBookingOpen, setCheckInBookingOpen] = useState(false)
  const [bookingPrefill, setBookingPrefill] = useState<{
    branchId: UUID
    roomId: UUID
    fromDate: string
    toDate: string
  } | null>(null)
  const [pendingCheckInAfterBooking, setPendingCheckInAfterBooking] = useState<Room | null>(null)
  const [bookedRoomIds, setBookedRoomIds] = useState<Set<string>>(() => new Set())

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

  const loadBookedRoomIds = useCallback(async () => {
    try {
      const s = await getRoomIdsBookedOnDate({ date: selectedDate, branchId })
      setBookedRoomIds(s)
    } catch {
      setBookedRoomIds(new Set())
    }
  }, [selectedDate, branchId])

  useEffect(() => {
    void loadBookedRoomIds()
  }, [loadBookedRoomIds])

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

  const roomsAfterSearch = useMemo(() => {
    let list = flatRooms
    const q = roomQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (r) => r.room_number.toLowerCase().includes(q) || r.room_type.toLowerCase().includes(q)
      )
    }
    return list
  }, [flatRooms, roomQuery])

  const filteredRooms = useMemo(() => {
    let list = roomsAfterSearch
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter)
    }
    if (dayOpsFilter !== "all") {
      list = list.filter((r) =>
        matchesDayOpsFilter(r, selectedDate, rateByRoomDate, metaByRoomDate, dayOpsFilter)
      )
    }
    return list
  }, [roomsAfterSearch, statusFilter, dayOpsFilter, selectedDate, rateByRoomDate, metaByRoomDate])

  const summary = useMemo(() => {
    let occupied = 0
    let empty = 0
    let maintenance = 0
    let needsCleanAfterCheckout = 0
    let notPaid = 0

    for (const r of roomsAfterSearch) {
      if (r.status === "occupied") occupied += 1
      else if (r.status === "available") empty += 1
      else maintenance += 1

      const price = rateByRoomDate.get(`${r.id}:${selectedDate}`)
      const meta = metaByRoomDate.get(`${r.id}:${selectedDate}`)
      const hasRevenue = typeof price === "number" && price > 0
      const checkedOut = meta?.checked_out === true
      const cleaned = meta?.cleaned === true
      if (checkedOut && !cleaned) needsCleanAfterCheckout += 1

      const pay = meta?.payment_status ?? "unpaid"
      if (hasRevenue && pay === "unpaid") notPaid += 1
    }

    return {
      total: roomsAfterSearch.length,
      occupied,
      empty,
      maintenance,
      needsCleanAfterCheckout,
      notPaid,
    }
  }, [roomsAfterSearch, rateByRoomDate, metaByRoomDate, selectedDate])

  const isSummaryBadgeActive = useCallback(
    (id: SummaryBadgeId) => {
      switch (id) {
        case "total":
          return statusFilter === "all" && dayOpsFilter === "all"
        case "occupied":
          return statusFilter === "occupied" && dayOpsFilter === "all"
        case "empty":
          return statusFilter === "available" && dayOpsFilter === "all"
        case "maintenance":
          return statusFilter === "maintenance" && dayOpsFilter === "all"
        case "needs_clean":
          return statusFilter === "all" && dayOpsFilter === "needs_clean"
        case "unpaid":
          return statusFilter === "all" && dayOpsFilter === "unpaid"
        default:
          return false
      }
    },
    [statusFilter, dayOpsFilter]
  )

  const onSummaryBadgeClick = useCallback(
    (id: SummaryBadgeId) => {
      if (isSummaryBadgeActive(id)) {
        setStatusFilter("all")
        setDayOpsFilter("all")
        return
      }
      switch (id) {
        case "total":
          setStatusFilter("all")
          setDayOpsFilter("all")
          break
        case "occupied":
          setStatusFilter("occupied")
          setDayOpsFilter("all")
          break
        case "empty":
          setStatusFilter("available")
          setDayOpsFilter("all")
          break
        case "maintenance":
          setStatusFilter("maintenance")
          setDayOpsFilter("all")
          break
        case "needs_clean":
          setStatusFilter("all")
          setDayOpsFilter("needs_clean")
          break
        case "unpaid":
          setStatusFilter("all")
          setDayOpsFilter("unpaid")
          break
      }
    },
    [isSummaryBadgeActive]
  )

  function openEdit(r: Room) {
    setEditingRoom(r)
    setEditOpen(true)
  }

  async function persistMetaForRoom(
    room: Room,
    patch: {
      cleaned?: boolean
      paymentStatus?: "unpaid" | "paid" | "partial"
      checkedOut?: boolean
      checkedInAt?: string | null
      checkedOutAt?: string | null
    }
  ) {
    const meta = metaByRoomDate.get(`${room.id}:${selectedDate}`)
    const guestName = meta?.guest_name?.trim() || null
    const guestPhone = meta?.guest_phone?.trim() || null
    const note = meta?.note?.trim() || null
    const paymentStatus = patch.paymentStatus ?? meta?.payment_status ?? "unpaid"
    const cleaned = patch.cleaned ?? meta?.cleaned ?? false
    const checkedOut = patch.checkedOut ?? meta?.checked_out ?? false
    const checkedInAt =
      patch.checkedInAt !== undefined ? patch.checkedInAt : (meta?.checked_in_at ?? null)
    const checkedOutAt =
      patch.checkedOutAt !== undefined ? patch.checkedOutAt : (meta?.checked_out_at ?? null)

    const hasMeta = Boolean(
      guestName ||
        guestPhone ||
        note ||
        paymentStatus !== "unpaid" ||
        cleaned ||
        checkedOut ||
        checkedInAt != null ||
        checkedOutAt != null
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
        checkedOut,
        checkedInAt,
        checkedOutAt,
      })
    }
  }

  async function onToggleCleaned(room: Room, cleaned: boolean) {
    await persistMetaForRoom(room, { cleaned })
  }

  async function onPaymentChange(room: Room, paymentStatus: "unpaid" | "paid" | "partial") {
    await persistMetaForRoom(room, { paymentStatus })
  }

  async function onCheckIn(room: Room) {
    await persistMetaForRoom(room, { checkedInAt: new Date().toISOString() })
  }

  async function handleCreateBookingForCheckIn(input: CreateBookingInput) {
    const pending = pendingCheckInAfterBooking
    await createBookingHook(input)
    await loadBookedRoomIds()
    if (pending) {
      const has = input.items.some((i) => i.roomId === pending.id && i.date === selectedDate)
      if (has) {
        await upsertMeta({
          branchId: pending.branch_id as UUID,
          roomId: pending.id,
          date: selectedDate,
          guestName: input.guestName.trim() || null,
          guestPhone: input.guestPhone?.trim() || null,
          paymentStatus: input.paymentStatus,
          note: input.note?.trim() || null,
          cleaned: false,
          checkedOut: false,
          checkedInAt: new Date().toISOString(),
          checkedOutAt: null,
        })
      }
      setPendingCheckInAfterBooking(null)
    }
    setBookingPrefill(null)
  }

  function requestCheckIn(room: Room) {
    if (bookedRoomIds.has(room.id)) {
      void onCheckIn(room)
      return
    }
    setCheckInPromptRoom(room)
  }

  async function onCheckout(room: Room) {
    const now = new Date().toISOString()
    await persistMetaForRoom(room, { checkedOut: true, checkedOutAt: now })
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

      <AlertDialog
        open={checkInPromptRoom !== null}
        onOpenChange={(o) => {
          if (!o) setCheckInPromptRoom(null)
        }}
      >
        <AlertDialogContent className="max-w-[min(420px,calc(100vw-24px))] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Chưa có đặt phòng cho ngày này</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Phòng{" "}
              <span className="font-medium text-foreground tabular-nums">{checkInPromptRoom?.room_number}</span> chưa có
              dòng đặt phòng (booking) trên hệ thống cho{" "}
              <span className="font-medium text-foreground tabular-nums">{selectedDate}</span>. Bạn vẫn có thể check-in
              (ví dụ cho mượn, không thu tiền), hoặc nhập đặt phòng / doanh thu trước rồi check-in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <AlertDialogCancel type="button">Hủy</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                const room = checkInPromptRoom
                if (!room) return
                setCheckInPromptRoom(null)
                setPendingCheckInAfterBooking(room)
                setBookingPrefill({
                  branchId: room.branch_id as UUID,
                  roomId: room.id,
                  fromDate: selectedDate,
                  toDate: selectedDate,
                })
                setCheckInBookingOpen(true)
              }}
            >
              Nhập đặt phòng trước
            </Button>
            <AlertDialogAction
              type="button"
              className="w-full sm:w-auto"
              onClick={() => {
                const room = checkInPromptRoom
                if (room) void onCheckIn(room)
                setCheckInPromptRoom(null)
              }}
            >
              Vẫn check-in
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BookingDialog
        open={checkInBookingOpen}
        onOpenChange={(o) => {
          setCheckInBookingOpen(o)
          if (!o) {
            setBookingPrefill(null)
            setPendingCheckInAfterBooking(null)
          }
        }}
        createBooking={handleCreateBookingForCheckIn}
        prefillCreate={bookingPrefill}
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
            void loadBookedRoomIds()
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
              <div className="grid w-full max-w-full gap-2 sm:grid-cols-2 lg:grid-cols-3">
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

                <div className="grid gap-1.5 text-xs min-w-0 sm:col-span-2 lg:col-span-1">
                  <Label>Lọc theo ngày đang xem</Label>
                  <Select value={dayOpsFilter} onValueChange={(v) => setDayOpsFilter(v as DayOpsFilter)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(v) =>
                          v === "all"
                            ? "Tất cả"
                            : v === "needs_clean"
                              ? "Cần dọn (sau checkout)"
                              : v === "in_stay"
                                ? "Đang có khách / đã check-in"
                                : v === "empty_day"
                                  ? "Trống (ngày này)"
                                  : v === "unpaid"
                                    ? "Có doanh thu, chưa thu tiền"
                                    : String(v ?? "")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="needs_clean">Cần dọn (sau checkout)</SelectItem>
                      <SelectItem value="in_stay">Đang có khách / đã check-in</SelectItem>
                      <SelectItem value="empty_day">Trống (ngày này)</SelectItem>
                      <SelectItem value="unpaid">Có doanh thu, chưa thu tiền</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5 text-xs min-w-0">
                <Label htmlFor="rooms-search">Tìm phòng</Label>
                <Input
                  id="rooms-search"
                  placeholder="Số phòng hoặc loại phòng…"
                  value={roomQuery}
                  onChange={(e) => setRoomQuery(e.target.value)}
                  autoComplete="off"
                />
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
        <SummaryFilterBadge
          active={isSummaryBadgeActive("total")}
          onClick={() => onSummaryBadgeClick("total")}
          className="border-border bg-muted/30"
        >
          <strong className="tabular-nums">{summary.total}</strong> phòng
        </SummaryFilterBadge>
        <SummaryFilterBadge
          active={isSummaryBadgeActive("occupied")}
          onClick={() => onSummaryBadgeClick("occupied")}
          className="border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
        >
          <strong className="tabular-nums">{summary.occupied}</strong> đang ở
        </SummaryFilterBadge>
        <SummaryFilterBadge
          active={isSummaryBadgeActive("empty")}
          onClick={() => onSummaryBadgeClick("empty")}
          className="border-muted-foreground/25 bg-muted/30"
        >
          <strong className="tabular-nums">{summary.empty}</strong> trống
        </SummaryFilterBadge>
        {summary.maintenance > 0 || isSummaryBadgeActive("maintenance") ? (
          <SummaryFilterBadge
            active={isSummaryBadgeActive("maintenance")}
            onClick={() => onSummaryBadgeClick("maintenance")}
            className="border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200"
          >
            <strong className="tabular-nums">{summary.maintenance}</strong> bảo trì
          </SummaryFilterBadge>
        ) : null}
        <SummaryFilterBadge
          active={isSummaryBadgeActive("needs_clean")}
          onClick={() => onSummaryBadgeClick("needs_clean")}
          className="border-destructive/35 bg-destructive/10 text-destructive"
        >
          <strong className="tabular-nums">{summary.needsCleanAfterCheckout}</strong> cần dọn
        </SummaryFilterBadge>
        <SummaryFilterBadge
          active={isSummaryBadgeActive("unpaid")}
          onClick={() => onSummaryBadgeClick("unpaid")}
          className="border-destructive/30 bg-destructive/10 text-destructive"
        >
          <strong className="tabular-nums">{summary.notPaid}</strong> chưa thu tiền
        </SummaryFilterBadge>
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
            const implicitInRoom = hasRevenue || hasGuest
            const checkedOut = meta?.checked_out === true
            const isCleaned = meta?.cleaned === true
            const hasCheckedInTs = Boolean(meta?.checked_in_at)
            const branchName = branchId === "all" ? (branchNameById.get(r.branch_id) ?? "") : ""

            const paymentValue = meta?.payment_status ?? "unpaid"

            const primaryBadge =
              r.status === "maintenance"
                ? {
                    label: "Bảo trì (hệ thống)",
                    cls: "border-destructive/35 bg-destructive/10 text-destructive",
                  }
                : checkedOut && !isCleaned
                  ? {
                      label: "Cần dọn phòng",
                      cls: "border-destructive/40 bg-destructive/15 text-destructive",
                    }
                  : checkedOut && isCleaned
                    ? {
                        label: "Đã dọn — sẵn sàng",
                        cls: "border-sky-500/40 bg-sky-500/15 text-sky-800 dark:text-sky-300",
                      }
                    : !checkedOut && (hasCheckedInTs || implicitInRoom)
                      ? {
                          label: hasCheckedInTs ? "Đã check-in" : "Có khách / đặt",
                          cls: "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
                        }
                      : {
                          label: "Trống",
                          cls: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
                        }

            const showCheckIn =
              r.status !== "maintenance" && !checkedOut && !hasCheckedInTs
            const showCheckout =
              r.status !== "maintenance" && !checkedOut && (hasCheckedInTs || implicitInRoom)

            const checkInLine = formatMetaDateTime(meta?.checked_in_at)
            const checkOutLine = formatMetaDateTime(meta?.checked_out_at)

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
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className={cn("text-[10px] font-medium", primaryBadge.cls)}>
                          {primaryBadge.label}
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
                          {paymentValue === "paid"
                            ? "Đã thu"
                            : paymentValue === "partial"
                              ? "Thu một phần"
                              : meta
                                ? "Chưa thu"
                                : "—"}
                        </Badge>
                      </div>
                      {checkInLine || checkOutLine ? (
                        <div className="mt-1.5 space-y-0.5 text-[10px] text-muted-foreground tabular-nums">
                          {checkInLine ? <div>Check-in lúc {checkInLine}</div> : null}
                          {checkOutLine ? <div>Checkout lúc {checkOutLine}</div> : null}
                        </div>
                      ) : null}
                    </div>
                    <Button variant="outline" size="xs" type="button" onClick={() => openEdit(r)}>
                      Sửa
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-2 pt-0 pb-3">
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
                    <div className="flex flex-col gap-2 text-[11px]">
                      <div className="flex flex-wrap gap-2">
                        {showCheckIn ? (
                          <Button
                            type="button"
                            variant="default"
                            size="xs"
                            className="w-full sm:w-auto"
                            onClick={() => requestCheckIn(r)}
                          >
                            Check-in
                          </Button>
                        ) : null}
                        {showCheckout ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="xs"
                            className="w-full sm:w-auto"
                            onClick={() => void onCheckout(r)}
                          >
                            Checkout
                          </Button>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
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
        <strong className="text-foreground">Check-in</strong> ghi nhận giờ nhận phòng. <strong className="text-foreground">Checkout</strong>{" "}
        ghi giờ trả phòng và chuyển sang cần dọn (tick &quot;Đã dọn phòng&quot; khi xong). Doanh thu / đặt phòng có thể có
        trước khi check-in. Thu tiền theo ngày đang xem.{" "}
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
