-- Số tiền đã thu (VND) khi chọn "thu một phần"

alter table public.bookings
  add column if not exists payment_partial_amount numeric
  check (payment_partial_amount is null or payment_partial_amount >= 0);

alter table public.room_day_meta
  add column if not exists payment_partial_amount numeric
  check (payment_partial_amount is null or payment_partial_amount >= 0);
