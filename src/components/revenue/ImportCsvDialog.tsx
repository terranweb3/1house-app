import { Dialog } from "@base-ui/react/dialog"
import Papa from "papaparse"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import type { Branch, Room, UUID } from "@/lib/types"

type ImportRecord = { branchId: UUID; roomId: UUID; date: string; price: number }

function norm(s: string) {
  return s.trim().toLowerCase()
}

function parseDateToIso(s: string): string | null {
  const raw = s.trim()
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return raw
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const dd = Number(m[1])
  const mm = Number(m[2])
  const yyyy = Number(m[3])
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12 || yyyy < 1900) return null
  return `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`
}

function parseMoneyCell(s: string): number | null {
  const raw = s.trim()
  if (!raw) return null
  const digits = raw.replaceAll(/[^\d]/g, "")
  if (!digits) return null
  const n = Number(digits)
  if (!Number.isFinite(n)) return null
  return n
}

export function ImportCsvDialog({
  open,
  onOpenChange,
  branches,
  rooms,
  onConfirmImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  branches: Branch[]
  rooms: Room[]
  onConfirmImport: (records: ImportRecord[]) => Promise<void>
}) {
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [records, setRecords] = useState<ImportRecord[]>([])
  const [warnings, setWarnings] = useState<string[]>([])

  const branchIdByName = useMemo(() => {
    const m = new Map<string, UUID>()
    for (const b of branches) m.set(norm(b.name), b.id)
    return m
  }, [branches])

  const roomIdByBranchAndNumber = useMemo(() => {
    const m = new Map<string, UUID>()
    for (const r of rooms) m.set(`${r.branch_id}:${r.room_number}`, r.id)
    return m
  }, [rooms])

  function reset() {
    setIsParsing(false)
    setIsImporting(false)
    setError(null)
    setRecords([])
    setWarnings([])
  }

  async function onPickFile(file: File) {
    reset()
    setIsParsing(true)
    try {
      const parsed = await new Promise<Papa.ParseResult<string[]>>((resolve, reject) => {
        Papa.parse<string[]>(file, {
          skipEmptyLines: true,
          complete: (r) => resolve(r as Papa.ParseResult<string[]>),
          error: (e) => reject(e),
        })
      })

      const rows = (parsed.data ?? []).filter((r) => Array.isArray(r) && r.some((c) => String(c ?? "").trim() !== ""))
      if (rows.length < 3) throw new Error("CSV không đúng format (cần ít nhất 2 dòng header + dữ liệu)")

      const header1 = rows[0].map((c) => String(c ?? "").trim())
      const header2 = rows[1].map((c) => String(c ?? "").trim())

      const lastCol2 = header2.findIndex((c) => norm(c) === norm("Tổng"))
      const lastCol1 = header1.findIndex((c) => norm(c) === norm("Tổng"))
      const lastCol = Math.max(lastCol2, lastCol1)
      const endCol = lastCol >= 0 ? lastCol : Math.max(header1.length, header2.length)

      type ColMap = { col: number; branchId: UUID; roomId: UUID; label: string } | { col: number; skip: true; reason: string }
      const colMaps: ColMap[] = []

      const csvBranchNames = new Set<string>()
      let currentBranchName = ""
      for (let col = 2; col < endCol; col++) {
        const bName = header1[col] ?? ""
        if (bName.trim()) {
          currentBranchName = bName.trim()
          csvBranchNames.add(currentBranchName)
        }

        const roomNumber = (header2[col] ?? "").trim()
        if (!roomNumber) {
          colMaps.push({ col, skip: true, reason: "Cột phòng trống" })
          continue
        }

        const branchId = branchIdByName.get(norm(currentBranchName))
        if (!branchId) {
          colMaps.push({ col, skip: true, reason: `Chi nhánh "${currentBranchName}" không có trong hệ thống` })
          continue
        }

        const roomId = roomIdByBranchAndNumber.get(`${branchId}:${roomNumber}`)
        if (!roomId) {
          colMaps.push({ col, skip: true, reason: `Phòng ${roomNumber} không có trong "${currentBranchName}"` })
          continue
        }

        colMaps.push({ col, branchId, roomId, label: `${currentBranchName} ${roomNumber}` })
      }

      const nextWarnings: string[] = []
      const skipped = colMaps.filter((c): c is { col: number; skip: true; reason: string } => "skip" in c)

      const unmatchedBranches = [...csvBranchNames].filter((n) => !branchIdByName.has(norm(n)))
      if (unmatchedBranches.length) {
        nextWarnings.push(`Chi nhánh trong CSV không khớp DB: ${unmatchedBranches.map((n) => `"${n}"`).join(", ")}`)
        nextWarnings.push(`Chi nhánh trong DB: ${branches.length ? branches.map((b) => `"${b.name}"`).join(", ") : "(chưa có)"}`)
      }

      if (skipped.length) {
        nextWarnings.push(`Bỏ qua ${skipped.length}/${colMaps.length} cột:`)
        for (const s of skipped.slice(0, 10)) nextWarnings.push(`  - Cột ${s.col + 1}: ${s.reason}`)
        if (skipped.length > 10) nextWarnings.push(`  - ... (+${skipped.length - 10} cột khác)`)
      }

      const out: ImportRecord[] = []
      const badRows: string[] = []
      for (let i = 2; i < rows.length; i++) {
        const row = rows[i]
        const firstCell = String(row[0] ?? "").trim()
        if (/^tháng\b/i.test(firstCell) || /^tổng\s*tháng\b/i.test(firstCell)) continue

        const dateIso = parseDateToIso(String(row[0] ?? ""))
        if (!dateIso) {
          badRows.push(`Dòng ${i + 1}: ngày không hợp lệ "${String(row[0] ?? "")}"`)
          continue
        }

        for (const m of colMaps) {
          if ("skip" in m) continue
          const cell = String(row[m.col] ?? "")
          const price = parseMoneyCell(cell)
          if (price === null) continue
          out.push({ branchId: m.branchId, roomId: m.roomId, date: dateIso, price })
        }
      }

      if (badRows.length) {
        nextWarnings.push(`Bỏ qua ${badRows.length} dòng do sai ngày.`)
        for (const r of badRows.slice(0, 5)) nextWarnings.push(`  - ${r}`)
        if (badRows.length > 5) nextWarnings.push(`  - ... (+${badRows.length - 5} dòng khác)`)
      }

      setWarnings(nextWarnings)
      setRecords(out)

      if (out.length === 0) {
        setError(
          unmatchedBranches.length
            ? `Không import được: tên chi nhánh trong CSV (${unmatchedBranches.map((n) => `"${n}"`).join(", ")}) không khớp với tên trong Cài đặt (${branches.length ? branches.map((b) => `"${b.name}"`).join(", ") : "chưa có chi nhánh nào"}). Vào Cài đặt tạo chi nhánh đúng tên rồi thử lại.`
            : "Không tìm thấy dữ liệu hợp lệ để import."
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse CSV thất bại")
    } finally {
      setIsParsing(false)
    }
  }

  async function onImport() {
    if (records.length === 0) return
    setIsImporting(true)
    setError(null)
    try {
      await onConfirmImport(records)
      onOpenChange(false)
      reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import thất bại")
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(860px,calc(100vw-24px))] max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold">Nhập CSV doanh thu</div>
              <div className="text-xs text-muted-foreground">
                Import file CSV export từ Google Sheet hoặc từ nút "Xuất CSV".
              </div>
            </div>
            <Button variant="outline" size="xs" type="button" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-xs">
              <div className="text-muted-foreground">Chọn file CSV</div>
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={isParsing || isImporting}
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0]
                  if (f) void onPickFile(f)
                }}
              />
            </label>

            {error ? <div className="text-xs text-destructive whitespace-pre-wrap">{error}</div> : null}

            {warnings.length ? (
              <div className="text-xs text-muted-foreground whitespace-pre-wrap border border-dashed p-2">
                {warnings.join("\n")}
              </div>
            ) : null}

            {records.length ? (
              <div className="grid gap-2">
                <div className="text-sm">
                  Sẵn sàng import: <span className="font-semibold">{records.length.toLocaleString("vi-VN")}</span> ô
                  doanh thu
                </div>
                <div className="border bg-background max-h-56 overflow-auto text-xs">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-background border-b">
                      <tr className="text-left">
                        <th className="p-2 font-medium">Ngày</th>
                        <th className="p-2 font-medium">Phòng</th>
                        <th className="p-2 font-medium text-right">Giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.slice(0, 20).map((r, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{r.date}</td>
                          <td className="p-2">{r.roomId}</td>
                          <td className="p-2 text-right tabular-nums">{r.price.toLocaleString("vi-VN")}</td>
                        </tr>
                      ))}
                      {records.length > 20 ? (
                        <tr className="border-t">
                          <td className="p-2 text-muted-foreground" colSpan={3}>
                            ... và {records.length - 20} dòng khác
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" type="button" disabled={isImporting} onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="button" disabled={isParsing || isImporting || records.length === 0} onClick={() => void onImport()}>
              {isImporting ? "Đang import..." : "Xác nhận import"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
