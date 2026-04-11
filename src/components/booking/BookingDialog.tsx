import { format, parseISO } from "date-fns"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { BookingRoomCombobox } from "@/components/booking/BookingRoomCombobox"
import { sortRooms } from "@/components/booking/sortRooms"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import {
  countNightsInclusive,
  expandLinesToCreateItems,
  groupBookingItemsToLines,
  MAX_NIGHTS_PER_LINE,
} from "@/lib/bookingRanges"
import { useBranches } from "@/hooks/useBranches"
import { useRooms } from "@/hooks/useRooms"
import type { BookingWithItems, PaymentStatus, UUID } from "@/lib/types"
import type { CreateBookingInput, UpdateBookingInput } from "@/lib/bookings"

type BookingItemInput = {
  id: string
  branchId: UUID | null
  roomId: UUID | null
  fromDate: string
  toDate: string
  pricePerNight: string
}

function todayIso() {
  return format(new Date(), "yyyy-MM-dd")
}

function generateId() {
  return Math.random().toString(36).slice(2)
}

function emptyLine(): BookingItemInput {
  const t = todayIso()
  return { id: generateId(), branchId: null, roomId: null, fromDate: t, toDate: t, pricePerNight: "" }
}

export function BookingDialog({
  open,
  onOpenChange,
  editBooking,
  createBooking,
  updateBooking,
  prefillCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editBooking?: BookingWithItems | null
  createBooking?: (input: CreateBookingInput) => Promise<void>
  updateBooking?: (id: UUID, input: UpdateBookingInput) => Promise<void>
  /** Khi tạo mới: điền sẵn một dòng (ví dụ từ màn Phòng — check-in cần đặt phòng). */
  prefillCreate?: {
    branchId: UUID
    roomId: UUID
    fromDate: string
    toDate: string
    pricePerNight?: string
  } | null
}) {
  const { branches } = useBranches()

  const [guestName, setGuestName] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid")
  const [note, setNote] = useState("")
  const [items, setItems] = useState<BookingItemInput[]>([emptyLine()])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const allRooms = useRooms("all")

  const branchNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const b of branches) m.set(b.id, b.name)
    return m
  }, [branches])

  useEffect(() => {
    if (!open) return
    if (editBooking) {
      setGuestName(editBooking.guest_name)
      setGuestPhone(editBooking.guest_phone ?? "")
      setPaymentStatus(editBooking.payment_status)
      setNote(editBooking.note ?? "")
      setItems(
        editBooking.items.length > 0
          ? groupBookingItemsToLines(editBooking.items, generateId)
          : [emptyLine()]
      )
    } else {
      setGuestName("")
      setGuestPhone("")
      setPaymentStatus("unpaid")
      setNote("")
      if (prefillCreate) {
        setItems([
          {
            id: generateId(),
            branchId: prefillCreate.branchId,
            roomId: prefillCreate.roomId,
            fromDate: prefillCreate.fromDate,
            toDate: prefillCreate.toDate,
            pricePerNight: prefillCreate.pricePerNight ?? "",
          },
        ])
      } else {
        setItems([emptyLine()])
      }
    }
    setError(null)
    setIsSaving(false)
  }, [open, editBooking, prefillCreate])

  const roomsByBranch = useMemo(() => {
    const map = new Map<UUID, ReturnType<typeof sortRooms>>()
    allRooms.rooms.forEach((room) => {
      const list = map.get(room.branch_id) ?? []
      list.push(room)
      map.set(room.branch_id, list)
    })
    map.forEach((list, key) => {
      map.set(key, sortRooms(list))
    })
    return map
  }, [allRooms.rooms])

  const linesStaySummary = useMemo(() => {
    const froms = items.map((i) => i.fromDate).filter((d) => d.trim() !== "")
    const tos = items.map((i) => i.toDate).filter((d) => d.trim() !== "")
    if (froms.length === 0 || tos.length === 0) return null
    const min = [...froms, ...tos].sort()[0]!
    const max = [...froms, ...tos].sort().slice(-1)[0]!
    const d0 = parseISO(min)
    const d1 = parseISO(max)
    if (Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime())) return null
    if (min === max) {
      return `Khách đặt ngày ${format(d0, "dd/MM/yyyy")}.`
    }
    return `Khách đặt từ ${format(d0, "dd/MM/yyyy")} đến ${format(d1, "dd/MM/yyyy")}.`
  }, [items])

  const bookingEstimate = useMemo(() => {
    let totalNights = 0
    let totalAmount = 0
    for (const item of items) {
      const n = countNightsInclusive(item.fromDate, item.toDate)
      const raw = item.pricePerNight.replaceAll(/[^\d]/g, "")
      const p = Number(raw)
      if (n > 0 && raw && Number.isFinite(p) && p >= 0) {
        totalNights += n
        totalAmount += n * p
      }
    }
    const lineCount = items.filter((i) => i.branchId && i.roomId).length
    return { totalNights, totalAmount, lineCount }
  }, [items])

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptyLine()])
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const updateItem = useCallback((id: string, field: keyof BookingItemInput, value: string | null) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        if (field === "branchId") {
          updated.roomId = null
        }
        return updated
      })
    )
  }, [])

  const validateLines = useCallback(() => {
    if (!guestName.trim()) return "Vui lòng nhập tên khách"
    if (items.length === 0) return "Vui lòng thêm ít nhất 1 phòng"
    for (const item of items) {
      if (!item.branchId) return "Vui lòng chọn chi nhánh cho tất cả các phòng"
      if (!item.roomId) return "Vui lòng chọn phòng cho tất cả các ô"
      if (!item.fromDate || !item.toDate) return "Vui lòng chọn từ ngày và đến ngày cho tất cả các phòng"
      const start = parseISO(item.fromDate)
      const end = parseISO(item.toDate)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Ngày không hợp lệ"
      if (start > end) return "Từ ngày phải trước hoặc bằng đến ngày"
      const nights = countNightsInclusive(item.fromDate, item.toDate)
      if (nights === 0) return "Khoảng ngày không hợp lệ"
      if (nights > MAX_NIGHTS_PER_LINE) return `Mỗi phòng tối đa ${MAX_NIGHTS_PER_LINE} đêm liên tiếp`
      const raw = item.pricePerNight.replaceAll(/[^\d]/g, "")
      const n = Number(raw)
      if (!raw || !Number.isFinite(n) || n < 0) return "Giá mỗi đêm không hợp lệ"
    }
    return null
  }, [guestName, items])

  const onSubmit = useCallback(async () => {
    const validationError = validateLines()
    if (validationError) return setError(validationError)

    setError(null)
    setIsSaving(true)
    try {
      if (editBooking) {
        if (!updateBooking) throw new Error("updateBooking is required for edit mode")
        await updateBooking(editBooking.id, {
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim() || null,
          paymentStatus,
          note: note.trim() || null,
        })
        toast.success("Cập nhật đặt phòng thành công")
      } else {
        if (!createBooking) throw new Error("createBooking is required for create mode")
        const lines = items.map((item) => ({
          branchId: item.branchId as UUID,
          roomId: item.roomId as UUID,
          fromDate: item.fromDate,
          toDate: item.toDate,
          pricePerNight: Number(item.pricePerNight.replaceAll(/[^\d]/g, "")),
        }))
        const bookingItems = expandLinesToCreateItems(lines)
        if (bookingItems.length === 0) throw new Error("Không có dòng đặt phòng hợp lệ")
        await createBooking({
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim() || null,
          paymentStatus,
          note: note.trim() || null,
          items: bookingItems,
        })
        toast.success("Tạo đặt phòng thành công")
      }
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại")
    } finally {
      setIsSaving(false)
    }
  }, [
    validateLines,
    items,
    editBooking,
    guestName,
    guestPhone,
    paymentStatus,
    note,
    onOpenChange,
    createBooking,
    updateBooking,
  ])

  const readOnly = Boolean(editBooking)

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal="trap-focus">
      <DialogContent className="w-full min-w-0 max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto sm:max-w-[min(960px,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{editBooking ? "Sửa đặt phòng" : "Tạo đặt phòng mới"}</DialogTitle>
          <DialogDescription>
            Mỗi dòng là một phòng (có thể khác chi nhánh): chọn từ ngày đến ngày và giá mỗi đêm. Thêm nhiều dòng để đặt
            nhiều phòng.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1.5 text-sm">
              <Label htmlFor="bd-guest">Tên khách *</Label>
              <Input
                id="bd-guest"
                placeholder="Ví dụ: Anh A"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                disabled={readOnly}
              />
            </div>

            <div className="grid gap-1.5 text-sm">
              <Label htmlFor="bd-phone">SĐT khách</Label>
              <Input
                id="bd-phone"
                inputMode="tel"
                placeholder="090..."
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="grid gap-1.5 text-sm">
            <Label htmlFor="bd-note">Ghi chú</Label>
            <Textarea
              id="bd-note"
              className="min-h-16"
              placeholder="Ví dụ: Khách chuyển khoản..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={readOnly}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-base font-medium">Danh sách phòng</Label>
              {!readOnly ? (
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  + Thêm phòng
                </Button>
              ) : null}
            </div>

            {readOnly ? (
              <p className="text-xs text-muted-foreground mb-3 mt-1">
                Để thay đổi phòng hoặc khoảng ngày, hãy xoá và tạo lại đặt phòng.
              </p>
            ) : null}

            {linesStaySummary ? (
              <p className="text-xs text-muted-foreground tabular-nums border border-dashed border-border/70 bg-muted/15 px-2.5 py-2 leading-snug mt-2">
                {linesStaySummary}
              </p>
            ) : !readOnly ? (
              <p className="text-xs text-muted-foreground mt-2">
                Chọn từ ngày và đến ngày trên từng dòng — tóm tắt khoảng đặt sẽ hiển thị ở đây.
              </p>
            ) : null}

            {!readOnly && (bookingEstimate.totalNights > 0 || bookingEstimate.lineCount > 0) ? (
              <p className="text-xs tabular-nums border border-border/60 bg-muted/10 px-2.5 py-2 mt-2 leading-snug">
                <span className="text-muted-foreground">Ước tính: </span>
                <span className="font-medium text-foreground">
                  {bookingEstimate.lineCount} phòng
                </span>
                <span className="text-muted-foreground"> · </span>
                <span className="font-medium text-foreground">{bookingEstimate.totalNights} đêm</span>
                <span className="text-muted-foreground"> · Tổng </span>
                <span className="font-semibold text-foreground">
                  {bookingEstimate.totalAmount.toLocaleString("vi-VN")} đ
                </span>
              </p>
            ) : null}

            <div className="space-y-3 mt-3">
              {items.map((item) => {
                const branchRooms = item.branchId ? roomsByBranch.get(item.branchId as UUID) ?? [] : []
                return (
                  <div
                    key={item.id}
                    className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] items-end border rounded-lg p-3 bg-muted/10"
                  >
                    <div className="grid gap-1 text-xs min-w-0">
                      <Label>Chi nhánh</Label>
                      <Select
                        value={item.branchId ?? undefined}
                        onValueChange={(v) => updateItem(item.id, "branchId", v ?? null)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="w-full min-w-0">
                          <SelectValue placeholder="Chọn chi nhánh">
                            {(value) =>
                              value != null && value !== ""
                                ? branchNameById.get(String(value)) ?? String(value)
                                : null
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-1 text-xs min-w-0">
                      <Label id={`bd-room-${item.id}`}>Phòng</Label>
                      <BookingRoomCombobox
                        rooms={branchRooms}
                        value={item.roomId}
                        onValueChange={(v) => updateItem(item.id, "roomId", v)}
                        disabled={readOnly || !item.branchId}
                        labelId={`bd-room-${item.id}`}
                      />
                    </div>

                    <div className="grid gap-1 text-xs">
                      <Label htmlFor={`bd-from-${item.id}`}>Từ ngày</Label>
                      <Input
                        id={`bd-from-${item.id}`}
                        type="date"
                        value={item.fromDate}
                        onChange={(e) => updateItem(item.id, "fromDate", e.target.value)}
                        disabled={readOnly}
                      />
                    </div>

                    <div className="grid gap-1 text-xs">
                      <Label htmlFor={`bd-to-${item.id}`}>Đến ngày</Label>
                      <Input
                        id={`bd-to-${item.id}`}
                        type="date"
                        value={item.toDate}
                        onChange={(e) => updateItem(item.id, "toDate", e.target.value)}
                        disabled={readOnly}
                      />
                    </div>

                    <div className="grid gap-1 text-xs">
                      <Label htmlFor={`bd-price-${item.id}`}>Giá / đêm</Label>
                      <Input
                        id={`bd-price-${item.id}`}
                        inputMode="numeric"
                        placeholder="850000"
                        value={item.pricePerNight}
                        onChange={(e) => updateItem(item.id, "pricePerNight", e.target.value)}
                        disabled={readOnly}
                      />
                    </div>

                    <div className="flex justify-center pb-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        disabled={readOnly || items.length === 1}
                        className="text-destructive hover:text-destructive"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid w-full max-w-md gap-1.5 text-sm">
            <Label>Thanh toán</Label>
            <Select
              value={paymentStatus}
              onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}
              disabled={readOnly}
            >
              <SelectTrigger className="w-full min-w-0">
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

        {error ? <div className="text-sm text-destructive whitespace-pre-wrap">{error}</div> : null}

        <DialogFooter>
          <Button variant="outline" type="button" disabled={isSaving} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" disabled={isSaving} onClick={() => void onSubmit()}>
            {isSaving ? "Đang lưu..." : editBooking ? "Cập nhật" : "Tạo đặt phòng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
