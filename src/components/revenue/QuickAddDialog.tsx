import { Dialog } from "@base-ui/react/dialog";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useBranches } from "@/hooks/useBranches";
import { useRooms } from "@/hooks/useRooms";
import { upsertRatesBatch } from "@/lib/rates";
import type { UUID } from "@/lib/types";

function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

export function QuickAddDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { branches } = useBranches();
  const [branchId, setBranchId] = useState<UUID>("" as UUID);
  const { rooms } = useRooms(branchId || "all");

  const [roomIds, setRoomIds] = useState<UUID[]>([]);
  const [from, setFrom] = useState(todayIso);
  const [to, setTo] = useState(todayIso);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const roomsForBranch = useMemo(
    () => rooms.filter((r) => r.branch_id === branchId),
    [rooms, branchId],
  );

  useEffect(() => {
    if (!open) return;
    const first = branches[0]?.id ?? ("" as UUID);
    setBranchId(first);
    setRoomIds([]);
    setFrom(todayIso());
    setTo(todayIso());
    setAmount("");
    setError(null);
    setIsSaving(false);
  }, [open, branches]);

  useEffect(() => {
    // Reset room selection when branch changes.
    setRoomIds([]);
  }, [branchId]);

  const dates = useMemo(() => {
    try {
      if (!from || !to) return [];
      const start = parseISO(from);
      const end = parseISO(to);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
        return [];
      if (start > end) return [];
      const ds = eachDayOfInterval({ start, end });
      if (ds.length > 62) return []; // safety
      return ds.map((d) => format(d, "yyyy-MM-dd"));
    } catch {
      return [];
    }
  }, [from, to]);

  async function onSubmit() {
    if (!branchId) return setError("Vui lòng chọn chi nhánh");
    if (roomIds.length === 0) return setError("Vui lòng chọn ít nhất 1 phòng");
    if (!from || !to) return setError("Vui lòng chọn ngày");
    if (dates.length === 0)
      return setError("Khoảng ngày không hợp lệ (tối đa 62 ngày)");

    const raw = amount.replaceAll(/[^\d]/g, "");
    const n = Number(raw);
    if (!raw || !Number.isFinite(n) || n < 0)
      return setError("Số tiền không hợp lệ");

    setError(null);
    setIsSaving(true);
    try {
      const recs = roomIds.flatMap((roomId) =>
        dates.map((date) => ({ branchId, roomId, date, price: n })),
      );
      await upsertRatesBatch(recs);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(860px,calc(100vw-24px))] max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold">
                Nhập doanh thu nhanh
              </div>
              <div className="text-xs text-muted-foreground">
                Chọn phòng + ngày (hoặc khoảng ngày) rồi nhập số tiền.
              </div>
            </div>
            <Button
              variant="outline"
              size="xs"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-xs">
              <div className="text-muted-foreground">Chi nhánh</div>
              <select
                className="h-9 border bg-background px-2 text-sm"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value as UUID)}
              >
                <option value="">Chọn chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-xs">
              <div className="text-muted-foreground">Số tiền</div>
              <input
                className="h-9 border bg-background px-2 text-sm tabular-nums"
                inputMode="numeric"
                placeholder="Ví dụ: 850000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>

            <label className="grid gap-1 text-xs">
              <div className="text-muted-foreground">Từ ngày</div>
              <input
                className="h-9 border bg-background px-2 text-sm"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>

            <label className="grid gap-1 text-xs">
              <div className="text-muted-foreground">Đến ngày</div>
              <input
                className="h-9 border bg-background px-2 text-sm"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-3 grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Chọn phòng</div>
              <div className="text-xs text-muted-foreground">
                Đã chọn: <span className="font-medium">{roomIds.length}</span>
              </div>
            </div>

            <div className="border bg-background max-h-64 overflow-auto p-2 grid gap-1">
              {branchId ? (
                roomsForBranch.length ? (
                  roomsForBranch.map((r) => {
                    const checked = roomIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className="flex items-center gap-2 text-sm h-9 px-2 border hover:bg-muted/20"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setRoomIds((prev) => {
                              if (e.target.checked)
                                return prev.includes(r.id)
                                  ? prev
                                  : [...prev, r.id];
                              return prev.filter((id) => id !== r.id);
                            });
                          }}
                        />
                        <span className="font-medium">{r.room_number}</span>
                        <span className="text-muted-foreground text-xs truncate">
                          {r.room_type}
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div className="text-sm text-muted-foreground p-2">
                    Chi nhánh này chưa có phòng.
                  </div>
                )
              ) : (
                <div className="text-sm text-muted-foreground p-2">
                  Chọn chi nhánh để hiện danh sách phòng.
                </div>
              )}
            </div>
          </div>

          {error ? (
            <div className="mt-3 text-xs text-destructive whitespace-pre-wrap">
              {error}
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={() => void onSubmit()}
            >
              {isSaving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
