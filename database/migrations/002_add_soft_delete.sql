-- Migration: Add soft delete support to chat_sessions table
-- Run this in Supabase SQL Editor

-- Add deleted_at column for soft delete functionality
-- When set, the session is considered deleted but data is retained
ALTER TABLE public.chat_sessions
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Add index for efficient filtering of non-deleted sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_deleted_at ON public.chat_sessions(deleted_at);

-- Add comment explaining the column
COMMENT ON COLUMN public.chat_sessions.deleted_at IS 'Soft delete timestamp - NULL means active, set value means deleted';
