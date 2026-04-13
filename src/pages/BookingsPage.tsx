import { format, isValid, parseISO } from "date-fns"
import { useState } from "react"
import { CalendarBlank, Globe, PencilSimple, Phone, Tag, Trash, CalendarPlus } from "@phosphor-icons/react"

import { BookingDialog } from "@/components/booking/BookingDialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import { useBookings } from "@/hooks/useBookings"
import { formatBookingSourceLabel } from "@/lib/bookingSource"
import { paymentBadge, paymentLabelWithPartial } from "@/lib/payment"
import type { BookingWithItems, PaymentStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Nhãn khoảng ngày từ các dòng đặt (theo calendar date). */
function bookingStayLabel(items: { date: string }[]): string | null {
  if (items.length === 0) return null
  const uniq = [...new Set(items.map((i) => i.date))].sort()
  const min = uniq[0]!
  const max = uniq[uniq.length - 1]!
  const d0 = parseISO(min)
  const d1 = parseISO(max)
  if (!isValid(d0) || !isValid(d1)) return null
  if (min === max) return `Ngày ${format(d0, "dd/MM/yyyy")}`
  return `Từ ${format(d0, "dd/MM/yyyy")} đến ${format(d1, "dd/MM/yyyy")}`
}

export function BookingsPage() {
  const { bookings, isLoading, error, deleteBooking, updateBooking } = useBookings()
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | "all">("all")
  const [deleteConfirm, setDeleteConfirm] = useState<BookingWithItems | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editBooking, setEditBooking] = useState<BookingWithItems | null>(null)

  const filtered = bookings.filter((b) => {
    const matchSearch =
      !search ||
      b.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      (b.guest_phone ?? "").includes(search)
    const matchStatus = filterStatus === "all" || b.payment_status === filterStatus
    return matchSearch && matchStatus
  })

  async function confirmDelete() {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      await deleteBooking(deleteConfirm.id)
      setDeleteConfirm(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="grid gap-3">
      <BookingDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o)
          if (!o) setEditBooking(null)
        }}
        editBooking={editBooking}
        updateBooking={updateBooking}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="text-lg font-bold leading-tight tracking-tight sm:text-xl">Đặt phòng</div>
          <div className="text-sm text-muted-foreground leading-snug">
            Danh sách đặt phòng. Mỗi khách có thể đặt nhiều phòng ở nhiều chi nhánh.
          </div>
        </div>
      </div>

      <Card size="sm" className="transition-shadow hover:shadow-[var(--shadow-warm-md)]">
        <CardContent className="py-3 grid gap-2 md:grid-cols-2">
          <div className="grid gap-1.5 text-xs">
            <Label htmlFor="bookings-search">Tìm kiếm</Label>
            <Input
              id="bookings-search"
              placeholder="Tên hoặc SĐT khách..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5 text-xs">
            <Label>Lọc trạng thái</Label>
            <Select
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as PaymentStatus | "all")}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue>
                  {(v) =>
                    v === "all"
                      ? "Tất cả"
                      : v === "unpaid"
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
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="unpaid">Chưa thu</SelectItem>
                <SelectItem value="partial">Thu một phần</SelectItem>
                <SelectItem value="paid">Đã thu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full md:w-2/3" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarPlus className="size-8" weight="duotone" />
          </div>
          <div className="max-w-sm space-y-1">
            <div className="text-base font-semibold text-foreground">
              {bookings.length === 0 ? "Chưa có đặt phòng" : "Không tìm thấy"}
            </div>
            <p className="text-sm text-muted-foreground">
              {bookings.length === 0
                ? "Thêm đặt phòng mới bằng nút Đặt phòng góc màn hình."
                : "Thử đổi bộ lọc hoặc từ khóa tìm kiếm."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((booking) => {
            const stay = bookingStayLabel(booking.items)
            return (
              <Card
                key={booking.id}
                size="sm"
                className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-warm-md)]"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{booking.guest_name}</span>
                        <Badge variant="outline" className={cn("text-xs max-w-full whitespace-normal text-left h-auto min-h-5 py-0.5", paymentBadge(booking.payment_status))}>
                          {paymentLabelWithPartial(
                            booking.payment_status,
                            booking.payment_partial_amount,
                          )}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 min-w-0">
                          <Globe className="size-3 shrink-0" />
                          <span className="min-w-0">
                            {formatBookingSourceLabel(
                              booking.booking_source,
                              booking.booking_source_other,
                            )}
                          </span>
                        </span>
                        {booking.guest_phone ? (
                          <span className="flex items-center gap-1 tabular-nums">
                            <Phone className="size-3" />
                            {booking.guest_phone}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1 tabular-nums">
                          <CalendarBlank className="size-3" />
                          {format(new Date(booking.created_at), "dd/MM/yyyy HH:mm")}
                        </span>
                        <span className="flex items-center gap-1 tabular-nums min-w-0">
                          <Tag className="size-3 shrink-0" />
                          <span className="min-w-0">
                            {booking.items.length} phòng
                            {booking.branch_names?.length ? ` · ${booking.branch_names.join(", ")}` : ""}
                            {stay ? ` · ${stay}` : ""}
                          </span>
                        </span>
                      </div>
                      {booking.note ? (
                        <p className="text-xs text-muted-foreground border-l-2 border-muted pl-2 line-clamp-2">
                          {booking.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-sm font-semibold tabular-mono">
                        {booking.items.reduce((sum, i) => sum + Number(i.price), 0).toLocaleString("vi-VN")} đ
                      </span>
                      <div className="flex items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          title="Sửa đặt phòng"
                          aria-label="Sửa đặt phòng"
                          onClick={() => {
                            setEditBooking(booking)
                            setEditOpen(true)
                          }}
                        >
                          <PencilSimple className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          title="Xoá đặt phòng"
                          aria-label="Xoá đặt phòng"
                          onClick={() => setDeleteConfirm(booking)}
                        >
                          <Trash className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteConfirm(null)
        }}
      >
        <DialogContent className="max-w-[min(400px,calc(100vw-24px))]">
          <DialogHeader>
            <DialogTitle>Xác nhận xoá</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xoá đặt phòng của{" "}
              <span className="font-medium text-foreground">{deleteConfirm?.guest_name}</span>?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={isDeleting}>
              {isDeleting ? "Đang xoá..." : "Xoá"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
