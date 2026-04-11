-- Explicit check-in / check-out timestamps per room-day

alter table public.room_day_meta
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_out_at timestamptz;

comment on column public.room_day_meta.checked_in_at is 'When staff marked guest checked in for this room-day';
comment on column public.room_day_meta.checked_out_at is 'When guest checked out for this room-day (alongside checked_out boolean)';
