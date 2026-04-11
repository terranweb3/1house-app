import { eachDayOfInterval, format, parseISO } from "date-fns"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { upsertMetasBatch } from "@/lib/roomDayMeta"
import { upsertRatesBatch } from "@/lib/rates"
import type { UUID } from "@/lib/types"

function todayIso() {
  return format(new Date(), "yyyy-MM-dd")
}

export function QuickAddDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { branches } = useBranches()
  const [branchId, setBranchId] = useState<UUID>("" as UUID)
  const { rooms } = useRooms(branchId || "all")

  const [roomIds, setRoomIds] = useState<UUID[]>([])
  const [from, setFrom] = useState(todayIso)
  const [to, setTo] = useState(todayIso)
  const [amount, setAmount] = useState("")
  const [guestName, setGuestName] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "paid" | "partial">("unpaid")
  const [note, setNote] = useState("")
  const [cleaned, setCleaned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const roomsForBranch = useMemo(() => rooms.filter((r) => r.branch_id === branchId), [rooms, branchId])

  useEffect(() => {
    if (!open) return
    const first = branches[0]?.id ?? ("" as UUID)
    setBranchId(first)
    setRoomIds([])
    setFrom(todayIso())
    setTo(todayIso())
    setAmount("")
    setGuestName("")
    setGuestPhone("")
    setPaymentStatus("unpaid")
    setNote("")
    setCleaned(false)
    setError(null)
    setIsSaving(false)
  }, [open, branches])

  useEffect(() => {
    setRoomIds([])
  }, [branchId])

  const dates = useMemo(() => {
    try {
      if (!from || !to) return []
      const start = parseISO(from)
      const end = parseISO(to)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return []
      if (start > end) return []
      const ds = eachDayOfInterval({ start, end })
      if (ds.length > 62) return []
      return ds.map((d) => format(d, "yyyy-MM-dd"))
    } catch {
      return []
    }
  }, [from, to])

  async function onSubmit() {
    if (!branchId) return setError("Vui lòng chọn chi nhánh")
    if (roomIds.length === 0) return setError("Vui lòng chọn ít nhất 1 phòng")
    if (!from || !to) return setError("Vui lòng chọn ngày")
    if (dates.length === 0) return setError("Khoảng ngày không hợp lệ (tối đa 62 ngày)")

    const raw = amount.replaceAll(/[^\d]/g, "")
    const n = Number(raw)
    if (!raw || !Number.isFinite(n) || n < 0) return setError("Số tiền không hợp lệ")

    const gn = guestName.trim() || null
    const gp = guestPhone.trim() || null
    const nt = note.trim() || null
    const hasMetaFields = Boolean(gn || gp || nt || paymentStatus !== "unpaid" || cleaned)

    setError(null)
    setIsSaving(true)
    try {
      const recs = roomIds.flatMap((roomId) => dates.map((date) => ({ branchId, roomId, date, price: n })))
      await upsertRatesBatch(recs)

      if (hasMetaFields) {
        const metaRows = roomIds.flatMap((roomId) => {
          const room = rooms.find((r) => r.id === roomId)
          if (!room || room.branch_id !== branchId) return []
          return dates.map((date) => ({
            branchId: room.branch_id as UUID,
            roomId,
            date,
            guestName: gn,
            guestPhone: gp,
            paymentStatus,
            note: nt,
            cleaned,
          }))
        })
        await upsertMetasBatch(metaRows)
      }

      toast.success("Đã lưu doanh thu nhanh")
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(860px,calc(100vw-24px))] sm:max-w-[860px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nhập doanh thu nhanh</DialogTitle>
          <DialogDescription>
            Cùng số tiền cho từng cặp phòng–ngày; thông tin khách / thanh toán / dọn áp dụng cho toàn bộ ô đã chọn.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1.5 text-xs">
            <Label>Chi nhánh</Label>
            <Select
              value={branchId || ""}
              onValueChange={(v) => setBranchId(v as UUID)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn chi nhánh" />
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

          <div className="grid gap-1.5 text-xs">
            <Label htmlFor="qa-amount">Số tiền (mỗi ngày × phòng)</Label>
            <Input
              id="qa-amount"
              className="tabular-nums"
              inputMode="numeric"
              placeholder="Ví dụ: 850000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5 text-xs">
            <Label htmlFor="qa-from">Từ ngày</Label>
            <Input id="qa-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>

          <div className="grid gap-1.5 text-xs">
            <Label htmlFor="qa-to">Đến ngày</Label>
            <Input id="qa-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          <div className="grid gap-1.5 text-xs md:col-span-2">
            <Label htmlFor="qa-guest">Tên khách (tuỳ chọn, áp dụng hàng loạt)</Label>
            <Input id="qa-guest" placeholder="Ví dụ: Anh A" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
          </div>

          <div className="grid gap-1.5 text-xs">
            <Label htmlFor="qa-phone">SĐT khách</Label>
            <Input
              id="qa-phone"
              className="tabular-nums w-full"
              inputMode="tel"
              placeholder="090..."
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5 text-xs">
            <Label>Thanh toán</Label>
            <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as "unpaid" | "paid" | "partial")}>
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

          <div className="grid gap-1.5 text-xs md:col-span-2">
            <Label htmlFor="qa-note">Ghi chú</Label>
            <Textarea
              id="qa-note"
              className="min-h-16"
              placeholder="Ví dụ: Khách chuyển khoản..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-xs md:col-span-2">
            <Checkbox id="qa-cleaned" checked={cleaned} onCheckedChange={(c) => setCleaned(c === true)} />
            <Label htmlFor="qa-cleaned" className="font-normal cursor-pointer">
              Đánh dấu đã dọn phòng cho tất cả ô đã chọn
            </Label>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium">Chọn phòng</div>
            <div className="text-xs text-muted-foreground">
              Đã chọn: <span className="font-medium">{roomIds.length}</span>
            </div>
          </div>

          <ScrollArea className="h-64 rounded-md border bg-background p-2">
            <div className="grid gap-1 pr-3">
              {branchId ? (
                roomsForBranch.length ? (
                  roomsForBranch.map((r) => {
                    const checked = roomIds.includes(r.id)
                    return (
                      <label
                        key={r.id}
                        className="flex items-center gap-2 text-sm h-9 px-2 border rounded-sm hover:bg-muted/20 cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => {
                            setRoomIds((prev) => {
                              const on = c === true
                              if (on) return prev.includes(r.id) ? prev : [...prev, r.id]
                              return prev.filter((id) => id !== r.id)
                            })
                          }}
                        />
                        <span className="font-medium">{r.room_number}</span>
                        <span className="text-muted-foreground text-xs truncate">{r.room_type}</span>
                      </label>
                    )
                  })
                ) : (
                  <div className="text-sm text-muted-foreground p-2">Chi nhánh này chưa có phòng.</div>
                )
              ) : (
                <div className="text-sm text-muted-foreground p-2">Chọn chi nhánh để hiện danh sách phòng.</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {error ? <div className="text-xs text-destructive whitespace-pre-wrap">{error}</div> : null}

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
