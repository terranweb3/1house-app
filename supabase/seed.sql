-- Seed minimal data for local testing

insert into public.branches (id, name, address)
values
  ('11111111-1111-1111-1111-111111111111', 'Chi nhanh A', 'Dia chi A'),
  ('22222222-2222-2222-2222-222222222222', 'Chi nhanh B', 'Dia chi B')
on conflict (id) do nothing;

insert into public.rooms (id, branch_id, room_number, room_type, status, notes)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', '101', 'double', 'available', null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111111', '102', 'double', 'available', null),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '22222222-2222-2222-2222-222222222222', '201', 'single', 'available', null)
on conflict (id) do nothing;
