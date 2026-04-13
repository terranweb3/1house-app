-- Nguồn đặt phòng (OTA / mạng xã hội / khác + ghi chú tùy chọn)

alter table public.bookings
  add column if not exists booking_source text not null default 'other';

alter table public.bookings
  add column if not exists booking_source_other text;

alter table public.bookings
  drop constraint if exists bookings_booking_source_check;

alter table public.bookings
  add constraint bookings_booking_source_check
  check (booking_source in ('booking_com', 'zalo', 'facebook', 'other'));

comment on column public.bookings.booking_source is 'booking_com | zalo | facebook | other';
comment on column public.bookings.booking_source_other is 'Khi booking_source = other: mô tả nguồn (VD: Google, giới thiệu...)';
