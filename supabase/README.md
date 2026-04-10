# Supabase setup

## 1) Create project

- Create a Supabase project
- Copy **Project URL** and **anon public key**

Create `.env` at repo root (see [`.env.example`](../.env.example)).

## 2) Apply schema

Run the SQL in:

- [`supabase/migrations/001_init.sql`](./migrations/001_init.sql)
- [`supabase/migrations/002_room_day_meta.sql`](./migrations/002_room_day_meta.sql)
- [`supabase/migrations/003_room_day_meta_guest_name.sql`](./migrations/003_room_day_meta_guest_name.sql)

Then (optional) seed sample data:

- [`supabase/seed.sql`](./seed.sql)

## 3) Auth

Enable Email/Password sign-in in Supabase Auth.

RLS policies in the migration allow any authenticated user to read/write. Tighten later by adding roles per branch.

