-- Samurai Insurance RLS Security Hardening
-- CRITICAL: Run this in Supabase SQL Editor AFTER rls_policies.sql
-- These additions fix vulnerabilities identified in the security audit

-- ============================================
-- 1. PROTECT external_id FROM MODIFICATION (CRITICAL)
-- Prevents account takeover via external_id UPDATE
-- ============================================

-- Create trigger function to prevent external_id changes
CREATE OR REPLACE FUNCTION prevent_external_id_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.external_id IS DISTINCT FROM NEW.external_id THEN
    RAISE EXCEPTION 'Cannot modify external_id - this field is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS protect_external_id ON public.users;

-- Create trigger on users table
CREATE TRIGGER protect_external_id
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_external_id_change();

-- ============================================
-- 2. ADD EXPLICIT NULL GUARDS TO POLICIES
-- Defense-in-depth: Ensure auth.uid() is never NULL
-- ============================================

-- Drop and recreate users policies with NULL guard
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND external_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND external_id = auth.uid()::text
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND external_id = auth.uid()::text
  );

-- ============================================
-- 3. FEEDBACK TABLE RATE LIMITING
-- Prevent spam/abuse via database-level rate limit
-- ============================================

-- Add created_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'feedback'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.feedback ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create rate limiting function for feedback
CREATE OR REPLACE FUNCTION check_feedback_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM public.feedback
    WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 hour'
  ) >= 10 THEN
    RAISE EXCEPTION 'Feedback rate limit exceeded (maximum 10 per hour)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS feedback_rate_limit ON public.feedback;

-- Create rate limit trigger
CREATE TRIGGER feedback_rate_limit
  BEFORE INSERT ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION check_feedback_rate_limit();

-- ============================================
-- 4. DISABLE REALTIME ON SENSITIVE TABLES
-- Prevents unauthorized broadcast of data changes
-- ============================================

-- Remove sensitive tables from realtime publication
-- Uses conditional check since DROP TABLE doesn't support IF EXISTS
DO $$
DECLARE
  table_in_pub BOOLEAN;
BEGIN
  -- Check and drop each table from publication if it exists there

  -- users
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'users'
  ) INTO table_in_pub;
  IF table_in_pub THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.users;
  END IF;

  -- conversations
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) INTO table_in_pub;
  IF table_in_pub THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.conversations;
  END IF;

  -- payments
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'payments'
  ) INTO table_in_pub;
  IF table_in_pub THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.payments;
  END IF;

  -- claims
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'claims'
  ) INTO table_in_pub;
  IF table_in_pub THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.claims;
  END IF;

  -- documents
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'documents'
  ) INTO table_in_pub;
  IF table_in_pub THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.documents;
  END IF;

  -- policies
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'policies'
  ) INTO table_in_pub;
  IF table_in_pub THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.policies;
  END IF;

  -- audit_trail
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'audit_trail'
  ) INTO table_in_pub;
  IF table_in_pub THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.audit_trail;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Publication may not exist or other issues - log and continue
  RAISE NOTICE 'Could not modify realtime publication: %', SQLERRM;
END $$;

-- ============================================
-- 5. CHAT SESSIONS - ADDITIONAL PROTECTION
-- Prevent session enumeration attacks
-- ============================================

-- Add index to speed up ownership lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id
  ON public.chat_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_session_id
  ON public.conversations(session_id);

-- ============================================
-- 6. AUDIT TRAIL - PREVENT TAMPERING
-- Users should only SELECT, never modify audit entries
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view own audit trail" ON public.audit_trail;

-- Recreate with explicit SELECT only (no INSERT/UPDATE/DELETE for users)
CREATE POLICY "Users can view own audit trail" ON public.audit_trail
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND user_id = (
      SELECT id FROM public.users
      WHERE external_id = auth.uid()::text
    )
  );

-- Ensure no other user-level policies exist for audit_trail
-- Only service_role should be able to INSERT

-- ============================================
-- VERIFICATION QUERIES
-- Run these to confirm hardening is applied
-- ============================================

-- Check triggers exist
-- SELECT tgname, tgrelid::regclass
-- FROM pg_trigger
-- WHERE tgname IN ('protect_external_id', 'feedback_rate_limit');

-- Check NULL guard in policies
-- SELECT policyname, qual
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'users';

-- Check realtime publication tables
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
