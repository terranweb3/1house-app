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
import { cn } from "@/lib/utils";

import { pickerPopoverContentClassName } from "./pickerPopoverClasses";

/**
 * Chọn một ngày làm “ngày đang xem” (trang Phòng) — lịch trong popover,
 * có thể gắn modifier (vd. chấm doanh thu).
 */
export function DayCalendarPopover({
  id,
  selectedDate,
  onSelectDate,
  month,
  onMonthChange,
  revenueDates,
}: {
  id?: string;
  selectedDate: string;
  onSelectDate: (isoYyyyMmDd: string) => void;
  month: Date;
  onMonthChange: (m: Date) => void;
  /** Các ngày yyyy-MM-dd có doanh thu (chấm xanh). */
  revenueDates: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => {
    const d = parseISO(selectedDate);
    return isValid(d) ? d : undefined;
  }, [selectedDate]);

  const [innerMonth, setInnerMonth] = useState(() => startOfMonth(month));
  useEffect(() => {
    setInnerMonth(startOfMonth(month));
  }, [month]);

  const label = selected
    ? format(selected, "EEEE, dd/MM/yyyy", { locale: vi })
    : "Chọn ngày";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        id={id}
        className={cn(
          buttonVariants({ variant: "outline", size: "default" }),
          "h-11 min-h-11 w-full min-w-0 justify-between gap-2 px-2.5 py-2 text-left font-normal md:min-h-8 md:h-8 md:py-1",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="min-w-0 flex-1 line-clamp-2 text-xs leading-snug">
          {label}
        </span>
        <CalendarBlankIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={6}
        className={pickerPopoverContentClassName()}
      >
        <Calendar
          mode="single"
          locale={vi}
          month={innerMonth}
          onMonthChange={(m) => {
            setInnerMonth(m);
            onMonthChange(m);
          }}
          selected={selected}
          onSelect={(d) => {
            if (!d) return;
            const iso = format(d, "yyyy-MM-dd");
            onSelectDate(iso);
            setOpen(false);
          }}
          modifiers={{
            hasRevenue: (date) => revenueDates.has(format(date, "yyyy-MM-dd")),
          }}
          modifiersClassNames={{
            hasRevenue: "has-revenue-dot",
          }}
          captionLayout="dropdown"
          fromYear={2000}
          toYear={2035}
          className={cn(
            "p-0",
            "w-full max-w-full",
            "[--cell-size:min(2.75rem,calc((min(22rem,100vw-2rem)-1rem)/7))]",
          )}
        />
      </PopoverContent>
    </Popover>
  );
}
