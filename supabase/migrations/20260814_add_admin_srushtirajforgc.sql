-- Migration: Add srushtirajforgc@gmail.com as Admin alongside srushtiraj.patil20@vit.edu
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/qvqxkgescavccwgwttsp/sql/new

-- Allow admin to select ALL messages
DROP POLICY IF EXISTS "Allow admin select all" ON public.support_messages;
CREATE POLICY "Allow admin select all" ON public.support_messages
  FOR SELECT USING (
    auth.jwt() ->> 'email' IN ('srushtiraj.patil20@vit.edu', 'srushtirajforgc@gmail.com')
  );

-- Admin can read all responses
DROP POLICY IF EXISTS "Allow admin read all responses" ON public.admin_responses;
CREATE POLICY "Allow admin read all responses" ON public.admin_responses
  FOR SELECT USING (
    auth.jwt() ->> 'email' IN ('srushtiraj.patil20@vit.edu', 'srushtirajforgc@gmail.com')
  );

-- Admin can insert responses
DROP POLICY IF EXISTS "Allow admin insert responses" ON public.admin_responses;
CREATE POLICY "Allow admin insert responses" ON public.admin_responses
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'email' IN ('srushtiraj.patil20@vit.edu', 'srushtirajforgc@gmail.com')
  );
