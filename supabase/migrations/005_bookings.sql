-- Bookings system: 1 guest can book multiple rooms across branches with different dates/prices

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  guest_phone text,
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'partial')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  branch_id uuid not null references public.branches(id),
  room_id uuid not null references public.rooms(id) on delete cascade,
  date date not null,
  price numeric not null check (price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_items_booking_id on public.booking_items(booking_id);
create index if not exists idx_booking_items_room_date on public.booking_items(room_id, date);

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;

drop policy if exists "bookings_auth_all" on public.bookings;
create policy "bookings_auth_all" on public.bookings
  for all to authenticated
  using (true) with check (true);

drop policy if exists "booking_items_auth_all" on public.booking_items;
create policy "booking_items_auth_all" on public.booking_items
  for all to authenticated
  using (true) with check (true);
