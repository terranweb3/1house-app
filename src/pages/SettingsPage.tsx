import { Dialog } from "@base-ui/react/dialog"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { useBranches } from "@/hooks/useBranches"
import { useRooms } from "@/hooks/useRooms"
import type { Branch, Room, RoomStatus, UUID } from "@/lib/types"

function tokenizeRoomInputs(raw: string): string[] {
  const out: string[] = []
  const chunks = raw
    .split(/\r?\n/g)
    .flatMap((line) => line.split(/[,\t]/g))
    .map((s) => s.trim())
    .filter(Boolean)

  for (const c of chunks) {
    const m = c.match(/^(\d+)\s*-\s*(\d+)$/)
    if (m) {
      const a = Number(m[1])
      const b = Number(m[2])
      if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) {
        const start = Math.min(a, b)
        const end = Math.max(a, b)
        if (end - start <= 5000) {
          for (let i = start; i <= end; i++) out.push(String(i))
          continue
        }
      }
    }
    out.push(c)
  }

  return out
}

function BranchFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onCreate,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initial: Branch | null
  onCreate: (input: Pick<Branch, "name" | "address">) => Promise<void>
  onUpdate: (input: Partial<Pick<Branch, "name" | "address">> & { id: UUID }) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && initial) {
      setName(initial.name)
      setAddress(initial.address ?? "")
    } else {
      setName("")
      setAddress("")
    }
    setError(null)
    setIsSaving(false)
  }, [open, mode, initial])

  async function onSubmit() {
    if (!name.trim()) {
      setError("Vui lòng nhập tên chi nhánh")
      return
    }
    setError(null)
    setIsSaving(true)
    try {
      if (mode === "edit" && initial) {
        await onUpdate({ id: initial.id, name: name.trim(), address: address.trim() || null })
      } else {
        await onCreate({ name: name.trim(), address: address.trim() || null })
      }
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu chi nhánh thất bại")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(560px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold">{mode === "edit" ? "Sửa chi nhánh" : "Thêm chi nhánh"}</div>
              <div className="text-xs text-muted-foreground">Tên + địa chỉ chi nhánh.</div>
            </div>
            <Button variant="outline" size="xs" type="button" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-xs">
              <div className="text-muted-foreground">Tên</div>
              <input
                className="h-9 border bg-background px-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs">
              <div className="text-muted-foreground">Địa chỉ</div>
              <input
                className="h-9 border bg-background px-2 text-sm"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
          </div>

          {error ? <div className="mt-3 text-xs text-destructive">{error}</div> : null}

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="button" disabled={isSaving} onClick={() => void onSubmit()}>
              {isSaving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function BulkRoomsDialog({
  open,
  onOpenChange,
  branches,
  defaultBranchId,
  onCreateBulk,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  branches: Branch[]
  defaultBranchId: UUID | null
  onCreateBulk: (args: {
    rooms: Array<Pick<Room, "branch_id" | "room_number" | "room_type" | "status" | "notes">>
    ignoreDuplicates?: boolean
  }) => Promise<void>
}) {
  const [branchId, setBranchId] = useState<UUID>("" as UUID)
  const [roomType, setRoomType] = useState("")
  const [status, setStatus] = useState<RoomStatus>("available")
  const [notes, setNotes] = useState("")
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(true)
  const [rawRooms, setRawRooms] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const parsedRooms = useMemo(() => {
    const tokens = tokenizeRoomInputs(rawRooms)
    const uniq = new Set<string>()
    const cleaned: string[] = []
    for (const t of tokens) {
      const v = t.trim()
      if (!v) continue
      if (uniq.has(v)) continue
      uniq.add(v)
      cleaned.push(v)
    }
    return cleaned
  }, [rawRooms])

  useEffect(() => {
    if (!open) return
    setBranchId(defaultBranchId ?? branches[0]?.id ?? ("" as UUID))
    setRoomType("")
    setStatus("available")
    setNotes("")
    setIgnoreDuplicates(true)
    setRawRooms("")
    setError(null)
    setIsSaving(false)
  }, [open, defaultBranchId, branches])

  async function onSubmit() {
    if (!branchId) {
      setError("Vui lòng chọn chi nhánh")
      return
    }
    if (!roomType.trim()) {
      setError("Vui lòng nhập loại phòng")
      return
    }
    if (parsedRooms.length === 0) {
      setError("Vui lòng nhập danh sách số phòng (mỗi dòng 1 phòng, hoặc 101-120)")
      return
    }
    if (parsedRooms.length > 2000) {
      setError("Danh sách quá lớn (tối đa 2000 phòng/lần). Hãy chia nhỏ và thử lại.")
      return
    }

    setError(null)
    setIsSaving(true)
    try {
      await onCreateBulk({
        ignoreDuplicates,
        rooms: parsedRooms.map((room_number) => ({
          branch_id: branchId,
          room_number,
          room_type: roomType.trim(),
          status,
          notes: notes.trim() || null,
        })),
      })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thêm phòng hàng loạt thất bại")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(720px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold">Thêm phòng hàng loạt</div>
              <div className="text-xs text-muted-foreground">Dán danh sách phòng (mỗi dòng 1 phòng, hoặc 101-120).</div>
            </div>
            <Button variant="outline" size="xs" type="button" onClick={() => onOpenChange(false)}>
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
              <div className="text-muted-foreground">Trạng thái</div>
              <select
                className="h-9 border bg-background px-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as RoomStatus)}
              >
                <option value="available">Trống</option>
                <option value="occupied">Đang ở</option>
                <option value="maintenance">Bảo trì</option>
              </select>
            </label>

            <label className="grid gap-1 text-xs">
              <div className="text-muted-foreground">Loại phòng</div>
              <input className="h-9 border bg-background px-2 text-sm" value={roomType} onChange={(e) => setRoomType(e.target.value)} />
            </label>

            <label className="grid gap-1 text-xs">
              <div className="text-muted-foreground">Tuỳ chọn</div>
              <label className="flex items-center gap-2 text-sm h-9 border bg-background px-2">
                <input
                  type="checkbox"
                  checked={ignoreDuplicates}
                  onChange={(e) => setIgnoreDuplicates(e.target.checked)}
                />
                Bỏ qua phòng trùng
              </label>
            </label>
          </div>

          <label className="mt-3 grid gap-1 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="text-muted-foreground">Danh sách số phòng</div>
              <div className="text-muted-foreground">
                Sẽ thêm: <span className="font-medium">{parsedRooms.length}</span>
              </div>
            </div>
            <textarea
              className="min-h-40 border bg-background p-2 text-sm font-mono"
              value={rawRooms}
              onChange={(e) => setRawRooms(e.target.value)}
              placeholder={`Ví dụ:\n101\n102\n103\n\nHoặc:\n201-220`}
            />
          </label>

          <label className="mt-3 grid gap-1 text-xs">
            <div className="text-muted-foreground">Ghi chú (áp dụng cho tất cả phòng)</div>
            <textarea className="min-h-16 border bg-background p-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          {error ? <div className="mt-3 text-xs text-destructive whitespace-pre-wrap">{error}</div> : null}

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" type="button" disabled={isSaving} onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="button" disabled={isSaving} onClick={() => void onSubmit()}>
              {isSaving ? "Đang lưu..." : "Thêm phòng"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function RoomFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  branches,
  defaultBranchId,
  onCreate,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initial: Room | null
  branches: Branch[]
  defaultBranchId: UUID | null
  onCreate: (input: Pick<Room, "branch_id" | "room_number" | "room_type" | "status" | "notes">) => Promise<void>
  onUpdate: (input: Partial<Pick<Room, "room_number" | "room_type" | "status" | "notes">> & { id: UUID }) => Promise<void>
}) {
  const [branchId, setBranchId] = useState<UUID>("" as UUID)
  const [roomNumber, setRoomNumber] = useState("")
  const [roomType, setRoomType] = useState("")
  const [status, setStatus] = useState<RoomStatus>("available")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && initial) {
      setBranchId(initial.branch_id)
      setRoomNumber(initial.room_number)
      setRoomType(initial.room_type)
      setStatus(initial.status)
      setNotes(initial.notes ?? "")
    } else {
      setBranchId(defaultBranchId ?? branches[0]?.id ?? ("" as UUID))
      setRoomNumber("")
      setRoomType("")
      setStatus("available")
      setNotes("")
    }
    setError(null)
    setIsSaving(false)
  }, [open, mode, initial, branches, defaultBranchId])

  async function onSubmit() {
    if (!branchId) {
      setError("Vui lòng chọn chi nhánh")
      return
    }
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
      if (mode === "edit" && initial) {
        await onUpdate({
          id: initial.id,
          room_number: roomNumber.trim(),
          room_type: roomType.trim(),
          status,
          notes: notes.trim() || null,
        })
      } else {
        await onCreate({
          branch_id: branchId,
          room_number: roomNumber.trim(),
          room_type: roomType.trim(),
          status,
          notes: notes.trim() || null,
        })
      }
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu phòng thất bại")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(640px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold">{mode === "edit" ? "Sửa phòng" : "Thêm phòng"}</div>
              <div className="text-xs text-muted-foreground">Số phòng, loại phòng, trạng thái.</div>
            </div>
            <Button variant="outline" size="xs" type="button" onClick={() => onOpenChange(false)}>
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
                disabled={mode === "edit"}
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
              <div className="text-muted-foreground">Trạng thái</div>
              <select
                className="h-9 border bg-background px-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as RoomStatus)}
              >
                <option value="available">Trống</option>
                <option value="occupied">Đang ở</option>
                <option value="maintenance">Bảo trì</option>
              </select>
            </label>

            <label className="grid gap-1 text-xs">
              <div className="text-muted-foreground">Số phòng</div>
              <input
                className="h-9 border bg-background px-2 text-sm"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs">
              <div className="text-muted-foreground">Loại phòng</div>
              <input
                className="h-9 border bg-background px-2 text-sm"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
              />
            </label>
          </div>

          <label className="mt-3 grid gap-1 text-xs">
            <div className="text-muted-foreground">Ghi chú</div>
            <textarea
              className="min-h-20 border bg-background p-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          {error ? <div className="mt-3 text-xs text-destructive">{error}</div> : null}

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="button" disabled={isSaving} onClick={() => void onSubmit()}>
              {isSaving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function SettingsPage() {
  const {
    branches,
    isLoading: isBranchesLoading,
    error: branchesError,
    createBranch,
    updateBranch,
    deleteBranch,
    refresh: refreshBranches,
  } = useBranches()

  const [roomsBranchId, setRoomsBranchId] = useState<UUID | "all">("all")
  const {
    rooms,
    isLoading: isRoomsLoading,
    error: roomsError,
    createRoom,
    createRoomsBulk,
    updateRoom,
    deleteRoom,
    refresh: refreshRooms,
  } = useRooms(roomsBranchId)

  const [tab, setTab] = useState<"branches" | "rooms">("branches")

  const [branchDialogOpen, setBranchDialogOpen] = useState(false)
  const [branchDialogMode, setBranchDialogMode] = useState<"create" | "edit">("create")
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)

  const [roomDialogOpen, setRoomDialogOpen] = useState(false)
  const [roomDialogMode, setRoomDialogMode] = useState<"create" | "edit">("create")
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  const [bulkRoomsOpen, setBulkRoomsOpen] = useState(false)

  const branchNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const b of branches) m.set(b.id, b.name)
    return m
  }, [branches])

  function openAddBranch() {
    setBranchDialogMode("create")
    setEditingBranch(null)
    setBranchDialogOpen(true)
  }

  function openEditBranch(b: Branch) {
    setBranchDialogMode("edit")
    setEditingBranch(b)
    setBranchDialogOpen(true)
  }

  function openAddRoom() {
    setRoomDialogMode("create")
    setEditingRoom(null)
    setRoomDialogOpen(true)
  }

  function openEditRoom(r: Room) {
    setRoomDialogMode("edit")
    setEditingRoom(r)
    setRoomDialogOpen(true)
  }

  return (
    <div className="grid gap-4">
      <BranchFormDialog
        open={branchDialogOpen}
        onOpenChange={setBranchDialogOpen}
        mode={branchDialogMode}
        initial={editingBranch}
        onCreate={createBranch}
        onUpdate={updateBranch}
      />
      <RoomFormDialog
        open={roomDialogOpen}
        onOpenChange={setRoomDialogOpen}
        mode={roomDialogMode}
        initial={editingRoom}
        branches={branches}
        defaultBranchId={roomsBranchId === "all" ? branches[0]?.id ?? null : (roomsBranchId as UUID)}
        onCreate={createRoom}
        onUpdate={updateRoom}
      />
      <BulkRoomsDialog
        open={bulkRoomsOpen}
        onOpenChange={setBulkRoomsOpen}
        branches={branches}
        defaultBranchId={roomsBranchId === "all" ? branches[0]?.id ?? null : (roomsBranchId as UUID)}
        onCreateBulk={createRoomsBulk}
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Cài đặt</div>
          <div className="text-sm text-muted-foreground">Quản lý chi nhánh và phòng.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={tab === "branches" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("branches")}
          >
            Chi nhánh
          </Button>
          <Button
            variant={tab === "rooms" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("rooms")}
          >
            Phòng
          </Button>
        </div>
      </div>

      {tab === "branches" ? (
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium">Danh sách chi nhánh</div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => openAddBranch()}>
                Thêm chi nhánh
              </Button>
              <Button variant="outline" size="sm" onClick={() => void refreshBranches()}>
                Làm mới
              </Button>
            </div>
          </div>

          {branchesError ? <div className="text-sm text-destructive">{branchesError}</div> : null}

          <div className="border bg-card">
            {/* Mobile: cards (avoid sticky header issues) */}
            <div className="md:hidden">
              {isBranchesLoading ? (
                <div className="p-3 text-sm text-muted-foreground">Đang tải...</div>
              ) : branches.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">Chưa có chi nhánh</div>
              ) : (
                <div className="divide-y">
                  {branches.map((b) => (
                    <div key={b.id} className="p-3 grid gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{b.name}</div>
                        {b.address ? <div className="text-xs text-muted-foreground wrap-break-word">{b.address}</div> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="xs" onClick={() => openEditBranch(b)}>
                          Sửa
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => {
                            const ok = confirm(`Xóa chi nhánh "${b.name}"? (Sẽ xóa cả phòng thuộc chi nhánh)`)
                            if (!ok) return
                            void deleteBranch(b.id)
                          }}
                        >
                          Xóa
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block max-h-[60vh] overflow-auto [-webkit-overflow-scrolling:touch]">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="sticky top-0 z-20 bg-card border-b shadow-sm">
                  <tr className="text-left">
                    <th className="p-3 font-medium">Tên</th>
                    <th className="p-3 font-medium">Địa chỉ</th>
                    <th className="p-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {isBranchesLoading ? (
                    <tr>
                      <td className="p-3 text-muted-foreground" colSpan={3}>
                        Đang tải...
                      </td>
                    </tr>
                  ) : branches.length === 0 ? (
                    <tr>
                      <td className="p-3 text-muted-foreground" colSpan={3}>
                        Chưa có chi nhánh
                      </td>
                    </tr>
                  ) : (
                    branches.map((b) => (
                      <tr key={b.id} className="border-t">
                        <td className="p-3">{b.name}</td>
                        <td className="p-3">{b.address ?? ""}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="xs" onClick={() => openEditBranch(b)}>
                              Sửa
                            </Button>
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => {
                                const ok = confirm(`Xóa chi nhánh "${b.name}"? (Sẽ xóa cả phòng thuộc chi nhánh)`)
                                if (!ok) return
                                void deleteBranch(b.id)
                              }}
                            >
                              Xóa
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="grid gap-1">
              <div className="text-sm font-medium">Danh sách phòng</div>
              <div className="text-xs text-muted-foreground">Chọn chi nhánh để lọc phòng.</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="grid gap-1 text-xs">
                <div className="text-muted-foreground">Chi nhánh</div>
                <select
                  className="h-9 border bg-background px-2 text-sm"
                  value={roomsBranchId}
                  onChange={(e) => setRoomsBranchId(e.target.value as UUID | "all")}
                >
                  <option value="all">Tất cả</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button size="sm" onClick={() => openAddRoom()}>
                Thêm phòng
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBulkRoomsOpen(true)}>
                Thêm hàng loạt
              </Button>
              <Button variant="outline" size="sm" onClick={() => void refreshRooms()}>
                Làm mới
              </Button>
            </div>
          </div>

          {roomsError ? <div className="text-sm text-destructive">{roomsError}</div> : null}

          <div className="border bg-card">
            {/* Mobile: cards */}
            <div className="md:hidden">
              {isRoomsLoading ? (
                <div className="p-3 text-sm text-muted-foreground">Đang tải...</div>
              ) : rooms.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">Chưa có phòng</div>
              ) : (
                <div className="divide-y">
                  {rooms.map((r) => (
                    <div key={r.id} className="p-3 grid gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            Phòng {r.room_number} · {r.room_type}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {branchNameById.get(r.branch_id) ?? r.branch_id}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs px-2 py-1 border bg-background">
                          {r.status === "available" ? "Trống" : r.status === "occupied" ? "Đang ở" : "Bảo trì"}
                        </div>
                      </div>

                      {r.notes ? <div className="text-xs text-muted-foreground wrap-break-word">{r.notes}</div> : null}

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="xs" onClick={() => openEditRoom(r)}>
                          Sửa
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => {
                            const ok = confirm(`Xóa phòng ${r.room_number}?`)
                            if (!ok) return
                            void deleteRoom(r.id)
                          }}
                        >
                          Xóa
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block max-h-[60vh] overflow-auto [-webkit-overflow-scrolling:touch]">
              <table className="min-w-[1000px] w-full text-sm">
                <thead className="sticky top-0 z-20 bg-card border-b shadow-sm">
                  <tr className="text-left">
                    <th className="p-3 font-medium">Chi nhánh</th>
                    <th className="p-3 font-medium">Số phòng</th>
                    <th className="p-3 font-medium">Loại</th>
                    <th className="p-3 font-medium">Trạng thái</th>
                    <th className="p-3 font-medium">Ghi chú</th>
                    <th className="p-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {isRoomsLoading ? (
                    <tr>
                      <td className="p-3 text-muted-foreground" colSpan={6}>
                        Đang tải...
                      </td>
                    </tr>
                  ) : rooms.length === 0 ? (
                    <tr>
                      <td className="p-3 text-muted-foreground" colSpan={6}>
                        Chưa có phòng
                      </td>
                    </tr>
                  ) : (
                    rooms.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-3">{branchNameById.get(r.branch_id) ?? r.branch_id}</td>
                        <td className="p-3">{r.room_number}</td>
                        <td className="p-3">{r.room_type}</td>
                        <td className="p-3">
                          {r.status === "available" ? "Trống" : r.status === "occupied" ? "Đang ở" : "Bảo trì"}
                        </td>
                        <td className="p-3 max-w-[320px]">
                          <div className="truncate" title={r.notes ?? ""}>
                            {r.notes ?? ""}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="xs" onClick={() => openEditRoom(r)}>
                              Sửa
                            </Button>
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => {
                                const ok = confirm(`Xóa phòng ${r.room_number}?`)
                                if (!ok) return
                                void deleteRoom(r.id)
                              }}
                            >
                              Xóa
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

