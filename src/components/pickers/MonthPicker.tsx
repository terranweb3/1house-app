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
 * Chọn tháng (YYYY-MM) bằng lịch — thay cho `input type="month"` trên iOS/Safari.
 */
export function MonthPicker({
  id,
  value,
  onChange,
  disabled,
  placeholder = "Chọn tháng",
}: {
  id?: string;
  /** `yyyy-MM` hoặc chuỗi rỗng khi chưa chọn */
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

  const [month, setMonth] = useState<Date>(() =>
    startOfMonth(selected ?? new Date()),
  );

  useEffect(() => {
    if (selected) setMonth(startOfMonth(selected));
  }, [selected]);

  const label = selected
    ? format(selected, "MMMM yyyy", { locale: vi })
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        id={id}
        disabled={disabled}
        className={cn(
          buttonVariants({ variant: "outline", size: "default" }),
          "h-11 w-full min-w-0 justify-between gap-2 px-2.5 font-normal md:h-8",
          !selected && "text-muted-foreground",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="min-w-0 truncate text-left text-xs capitalize">
          {label}
        </span>
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
            onChange(format(startOfMonth(d), "yyyy-MM"));
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
