import { cn } from "@/lib/utils";

/** Popover chứa lịch — z-index trên dialog; rộng vừa màn hình điện thoại. */
export function pickerPopoverContentClassName(extra?: string) {
  return cn(
    "z-100 w-[min(22rem,calc(100vw-2rem))] max-w-[min(22rem,calc(100vw-2rem))] p-2",
    extra,
  );
}

/** Tiêu đề / mô tả phía trên lịch (MonthPicker). */
export function pickerPopoverHeaderClassName(extra?: string) {
  return cn("border-b border-border/50 px-3 py-2.5", extra);
}

/** Vùng chứa Calendar bên dưới header. */
export function pickerPopoverBodyClassName(extra?: string) {
  return cn("p-2 pt-1", extra);
}
