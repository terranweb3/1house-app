-- Guest info per room per day (phone, payment status, note)

create table if not exists public.room_day_meta (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  date date not null,
  guest_phone text,
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'partial')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, date)
);

drop trigger if exists room_day_meta_set_updated_at on public.room_day_meta;
create trigger room_day_meta_set_updated_at
before update on public.room_day_meta
for each row execute function public.set_updated_at();

alter table public.room_day_meta enable row level security;

drop policy if exists "room_day_meta_auth_all" on public.room_day_meta;
create policy "room_day_meta_auth_all" on public.room_day_meta
  for all to authenticated
  using (true) with check (true);

