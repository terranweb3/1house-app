-- 1House Revenue Tracker - schema (branches, rooms, rates)

create extension if not exists "pgcrypto";

-- Drop legacy tables from previous schema
drop table if exists public.bookings;

-- ── Branches ──

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

-- ── Rooms ──

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  room_number text not null,
  room_type text not null,
  status text not null default 'available'
    check (status in ('available', 'occupied', 'maintenance')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, room_number)
);

-- ── Rates (revenue per room per date) ──

create table if not exists public.rates (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  date date not null,
  price numeric not null check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, date)
);

-- ── updated_at triggers ──

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

drop trigger if exists rates_set_updated_at on public.rates;
create trigger rates_set_updated_at
before update on public.rates
for each row execute function public.set_updated_at();

-- ── RLS (staff-only) ──

alter table public.branches enable row level security;
alter table public.rooms enable row level security;
alter table public.rates enable row level security;

drop policy if exists "branches_auth_all" on public.branches;
create policy "branches_auth_all" on public.branches
  for all to authenticated
  using (true) with check (true);

drop policy if exists "rooms_auth_all" on public.rooms;
create policy "rooms_auth_all" on public.rooms
  for all to authenticated
  using (true) with check (true);

drop policy if exists "rates_auth_all" on public.rates;
create policy "rates_auth_all" on public.rates
  for all to authenticated
  using (true) with check (true);
