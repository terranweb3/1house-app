import { format, isValid, parseISO, startOfMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarBlankIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { pickerPopoverContentClassName } from "@/components/pickers/pickerPopoverClasses";
import { cn } from "@/lib/utils";

function parseLocalDay(iso: string): Date | undefined {
  const d = parseISO(iso);
  return isValid(d) ? d : undefined;
}

/**
 * Chọn một ngày (YYYY-MM-DD) bằng lịch — tránh ô `input type="date"` của iOS/Safari
 * trong dialog (hay tràn, khó căn, giao diện không đồng nhất).
 */
export function BookingDatePicker({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (isoYyyyMmDd: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => (value.trim() ? parseLocalDay(value) : undefined),
    [value],
  );

  const [month, setMonth] = useState<Date>(() =>
    startOfMonth(selected ?? new Date()),
  );

  useEffect(() => {
    if (selected) setMonth(startOfMonth(selected));
  }, [selected]);

  const label = selected
    ? format(selected, "dd/MM/yyyy", { locale: vi })
    : "Chọn ngày";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        id={id}
        disabled={disabled}
        className={cn(
          buttonVariants({ variant: "outline", size: "default" }),
          "h-11 w-full min-w-0 justify-between gap-2 px-2.5 font-normal tabular-nums md:h-8",
          !selected && "text-muted-foreground",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="min-w-0 truncate text-left text-xs">{label}</span>
        <CalendarBlankIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className={pickerPopoverContentClassName()}
      >
        <Calendar
          mode="single"
          locale={vi}
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={(d) => {
            if (!d) return;
            onChange(format(d, "yyyy-MM-dd"));
            setOpen(false);
          }}
          captionLayout="dropdown"
          fromYear={2000}
          toYear={2035}
          className={cn(
            "p-0",
            "[--cell-size:min(2.75rem,calc((min(22rem,100vw-2rem)-1rem)/7))]",
          )}
        />
      </PopoverContent>
    </Popover>
  );
}
