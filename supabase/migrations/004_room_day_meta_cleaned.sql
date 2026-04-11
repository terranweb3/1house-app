-- Housekeeping: room cleaned for that day

alter table public.room_day_meta
add column if not exists cleaned boolean not null default false;
