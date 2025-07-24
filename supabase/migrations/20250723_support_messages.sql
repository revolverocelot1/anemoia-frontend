-- Migration: create support_messages table and RLS policies

create extension if not exists "uuid-ossp";

create table if not exists public.support_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text not null,
  user_name text,
  subject text not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc', now())
);

-- Row Level Security
alter table public.support_messages enable row level security;

-- Allow authenticated users to insert their own messages
create policy "Allow insert for authenticated" on public.support_messages for insert with check (auth.uid() = user_id);

-- Allow anonymous inserts for testing (optional - remove in production)
create policy "Allow anonymous insert" on public.support_messages for insert with check (user_id = '00000000-0000-0000-0000-000000000000');

-- Allow owner to select their own messages (optional for future UI)
create policy "Allow select own" on public.support_messages for select using (auth.uid() = user_id);

-- Grant select to service role (edge functions)
grant select, insert on public.support_messages to authenticated; 