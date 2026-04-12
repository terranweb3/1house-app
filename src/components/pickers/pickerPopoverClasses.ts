import { cn } from "@/lib/utils";

/** Popover chứa lịch — z-index trên dialog; rộng vừa màn hình điện thoại. */
export function pickerPopoverContentClassName(extra?: string) {
  return cn(
    "z-100 w-[min(22rem,calc(100vw-2rem))] max-w-[min(22rem,calc(100vw-2rem))] p-2",
    extra,
  );
}
