-- Checkout flag: after guest leaves, staff sees "cần dọn" until cleaned

alter table public.room_day_meta
  add column if not exists checked_out boolean not null default false;

comment on column public.room_day_meta.checked_out is 'True after checkout for this room-day; needs cleaning until cleaned=true';
