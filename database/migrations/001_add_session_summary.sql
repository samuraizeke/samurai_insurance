-- Migration: Add summary column to chat_sessions table
-- Run this in Supabase SQL Editor

-- Add summary column to store AI-generated conversation titles
ALTER TABLE public.chat_sessions
ADD COLUMN IF NOT EXISTS summary character varying(100);

-- Add comment explaining the column
COMMENT ON COLUMN public.chat_sessions.summary IS 'AI-generated 4-5 word summary of the conversation topic';
