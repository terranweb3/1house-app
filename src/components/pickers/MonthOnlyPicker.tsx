import { format, isValid, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { CaretDown, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import {
  pickerPopoverBodyClassName,
  pickerPopoverContentClassName,
  pickerPopoverHeaderClassName,
} from "./pickerPopoverClasses";

const MIN_YEAR = 2000;
const MAX_YEAR = 2035;

function parseYm(yyyyMm: string): { y: number; m: number } | null {
  const t = yyyyMm.trim();
  if (!t) return null;
  const d = parseISO(`${t}-01`);
  if (!isValid(d)) return null;
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

function toYm(y: number, monthIndex1: number) {
  return `${y}-${String(monthIndex1).padStart(2, "0")}`;
}

/**
 * Chọn tháng (YYYY-MM): lưới 12 tháng + năm — không dùng lịch ngày.
 */
export function MonthOnlyPicker({
  id,
  value,
  onChange,
  disabled,
  placeholder = "Chọn tháng",
}: {
  id?: string;
  value: string;
  onChange: (yyyyMm: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => {
    const t = value.trim();
    if (!t) return undefined;
    const d = parseISO(`${t}-01`);
    return isValid(d) ? d : undefined;
  }, [value]);

  const [panelYear, setPanelYear] = useState(() => new Date().getFullYear());

  const label = selected
    ? format(selected, "MMMM yyyy", { locale: vi })
    : placeholder;

  const selectedYm = parseYm(value);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          if (selected) setPanelYear(selected.getFullYear());
          else setPanelYear(new Date().getFullYear());
        }
      }}
    >
      <PopoverTrigger
        type="button"
        id={id}
        disabled={disabled}
        className={cn(
          "group flex h-auto min-h-[3.25rem] w-full min-w-0 items-stretch gap-3 rounded-xl border border-border/70 bg-background px-3 py-2.5 text-left shadow-sm transition-all",
          "hover:border-primary/35 hover:shadow-[var(--shadow-warm-md)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          open &&
            "border-primary/45 shadow-[var(--shadow-warm-md)] ring-1 ring-primary/15",
          !selected && "text-muted-foreground",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <div className="min-w-0 flex-1 py-0.5">
          <div className="mt-0.5 truncate text-base font-bold capitalize leading-tight tracking-tight text-foreground">
            {selected ? label : placeholder}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-center self-center">
          <CaretDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
            weight="bold"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className={pickerPopoverContentClassName("gap-0 p-0")}
      >
        <PopoverHeader className={pickerPopoverHeaderClassName()}>
          <PopoverTitle className="text-base font-semibold">
            Chọn tháng
          </PopoverTitle>
        </PopoverHeader>
        <div className={pickerPopoverBodyClassName("space-y-3")}>
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="shrink-0"
              disabled={panelYear <= MIN_YEAR}
              onClick={() => setPanelYear((y) => Math.max(MIN_YEAR, y - 1))}
              aria-label="Năm trước"
            >
              <CaretLeft className="size-4" />
            </Button>
            <div className="min-w-0 text-center text-base font-semibold tabular-nums">
              {panelYear}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="shrink-0"
              disabled={panelYear >= MAX_YEAR}
              onClick={() => setPanelYear((y) => Math.min(MAX_YEAR, y + 1))}
              aria-label="Năm sau"
            >
              <CaretRight className="size-4" />
            </Button>
          </div>

          <div
            className="grid grid-cols-3 gap-2 sm:grid-cols-4"
            role="listbox"
            aria-label={`Chọn tháng trong năm ${panelYear}`}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const month1 = i + 1;
              const ym = toYm(panelYear, month1);
              const isSel =
                selectedYm?.y === panelYear && selectedYm?.m === month1;
              const shortLabel = format(new Date(panelYear, i, 1), "MMM", {
                locale: vi,
              });
              return (
                <button
                  key={ym}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-center text-sm font-medium transition-colors",
                    "hover:border-primary/50 hover:bg-primary/5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    isSel
                      ? "border-primary bg-primary/12 text-primary shadow-sm"
                      : "border-border/60 bg-background text-foreground",
                  )}
                  onClick={() => {
                    onChange(ym);
                    setOpen(false);
                  }}
                >
                  <span className="block capitalize leading-tight">
                    {shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
