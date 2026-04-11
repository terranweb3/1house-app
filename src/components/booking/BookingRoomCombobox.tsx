import { CaretDownIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useId, useMemo, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Room, UUID } from "@/lib/types";
import { cn } from "@/lib/utils";

import { sortRooms } from "./sortRooms";

export function BookingRoomCombobox({
  rooms,
  value,
  onValueChange,
  disabled,
  labelId,
}: {
  rooms: Room[];
  value: UUID | null;
  onValueChange: (id: UUID | null) => void;
  disabled?: boolean;
  labelId?: string;
}) {
  const searchFieldId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => sortRooms(rooms), [rooms]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (r) =>
        r.room_number.toLowerCase().includes(q) ||
        r.room_type.toLowerCase().includes(q),
    );
  }, [sorted, query]);

  const selected = value ? sorted.find((r) => r.id === value) : undefined;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        type="button"
        disabled={disabled}
        className={cn(
          buttonVariants({ variant: "outline", size: "default" }),
          "w-full min-w-0 justify-between gap-2 font-normal",
          !selected && "text-muted-foreground",
        )}
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 truncate text-left text-xs">
          {selected ? (
            <>
              <span className="font-medium tabular-nums">
                {selected.room_number}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · {selected.room_type}
              </span>
            </>
          ) : (
            "Chọn phòng"
          )}
        </span>
        <CaretDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[min(calc(100vw-2rem),22rem)] max-w-[min(calc(100vw-2rem),22rem)] p-0 gap-0 rounded-none shadow-md"
      >
        <div className="border-b p-2">
          <Label htmlFor={searchFieldId} className="sr-only">
            Tìm phòng
          </Label>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={searchFieldId}
              className="h-8 rounded-none pl-8 text-xs"
              placeholder="Số phòng hoặc loại phòng..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="h-[min(240px,40vh)]">
          <div role="listbox" className="p-1 pr-3">
            {filtered.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                {sorted.length === 0
                  ? "Chưa có phòng ở chi nhánh này."
                  : "Không tìm thấy phòng phù hợp."}
              </div>
            ) : (
              filtered.map((r) => {
                const isSel = r.id === value;
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    className={cn(
                      "flex w-full items-baseline gap-2 rounded-none px-2 py-2 text-left text-xs outline-none transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSel && "bg-accent/80",
                    )}
                    onClick={() => {
                      onValueChange(r.id);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="min-w-10 font-medium tabular-nums">
                      {r.room_number}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {r.room_type}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
