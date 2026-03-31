-- Migration: Fix admin visibility + add admin_responses table
-- Run this ENTIRE script in the Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/qvqxkgescavccwgwttsp/sql/new

-- ============================================================
-- STEP 1: Ensure support_messages table exists (idempotent)
-- ============================================================
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

alter table public.support_messages enable row level security;

-- ============================================================
-- STEP 2: Drop old policies if they exist, then recreate
-- ============================================================
drop policy if exists "Allow insert for authenticated" on public.support_messages;
drop policy if exists "Allow anonymous insert" on public.support_messages;
drop policy if exists "Allow select own" on public.support_messages;
drop policy if exists "Allow admin select all" on public.support_messages;

-- Allow authenticated users to insert their own messages
create policy "Allow insert for authenticated" on public.support_messages
  for insert with check (auth.uid() = user_id);

-- Allow users to select their own messages
create policy "Allow select own" on public.support_messages
  for select using (auth.uid() = user_id);

-- Allow admin to select ALL messages
create policy "Allow admin select all" on public.support_messages
  for select using (
    auth.jwt() ->> 'email' IN ('srushtiraj.patil20@vit.edu')
  );

-- Grant permissions to authenticated role
grant select, insert on public.support_messages to authenticated;

-- ============================================================
-- STEP 3: Create admin_responses table for admin replies
-- ============================================================
create table if not exists public.admin_responses (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid references public.support_messages(id) on delete cascade not null,
  admin_email text not null,
  response text not null,
  created_at timestamp with time zone default timezone('utc', now())
);

alter table public.admin_responses enable row level security;

-- Users can read responses to their own support messages
create policy "Allow user read own responses" on public.admin_responses
  for select using (
    exists (
      select 1 from public.support_messages sm
      where sm.id = admin_responses.message_id
        and sm.user_id = auth.uid()
    )
  );

-- Admin can read all responses
create policy "Allow admin read all responses" on public.admin_responses
  for select using (
    auth.jwt() ->> 'email' IN ('srushtiraj.patil20@vit.edu')
  );

-- Admin can insert responses
create policy "Allow admin insert responses" on public.admin_responses
  for insert with check (
    auth.jwt() ->> 'email' IN ('srushtiraj.patil20@vit.edu')
  );

-- Grant permissions
grant select, insert on public.admin_responses to authenticated;
