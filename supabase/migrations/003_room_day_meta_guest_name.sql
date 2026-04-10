-- Add guest_name to room_day_meta

alter table public.room_day_meta
add column if not exists guest_name text;

