-- Samurai Insurance Row Level Security (RLS) Policies
-- CRITICAL: Run this in Supabase SQL Editor to enable RLS
-- These policies enforce Zero Trust access control at the database level

-- ============================================
-- ENABLE RLS ON ALL SENSITIVE TABLES
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rating_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (if any) - for clean slate
-- ============================================

-- Users policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role full access to users" ON public.users;

-- Policies table policies
DROP POLICY IF EXISTS "Users can view own policies" ON public.policies;
DROP POLICY IF EXISTS "Service role full access to policies" ON public.policies;

-- Chat sessions policies
DROP POLICY IF EXISTS "Users can manage own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Service role full access to chat_sessions" ON public.chat_sessions;

-- Conversations policies
DROP POLICY IF EXISTS "Users can access own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Service role full access to conversations" ON public.conversations;

-- Claims policies
DROP POLICY IF EXISTS "Users can view own claims" ON public.claims;
DROP POLICY IF EXISTS "Service role full access to claims" ON public.claims;

-- Documents policies
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Service role full access to documents" ON public.documents;

-- Payments policies
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Service role full access to payments" ON public.payments;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can only view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT TO authenticated
  USING (external_id = auth.uid()::text);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (external_id = auth.uid()::text)
  WITH CHECK (external_id = auth.uid()::text);

-- Service role (backend) has full access
CREATE POLICY "Service role full access to users" ON public.users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- POLICIES TABLE RLS POLICIES
-- ============================================

-- Users can only view their own insurance policies
CREATE POLICY "Users can view own policies" ON public.policies
  FOR SELECT TO authenticated
  USING (user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text));

-- Service role (backend) has full access
CREATE POLICY "Service role full access to policies" ON public.policies
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- CHAT SESSIONS POLICIES
-- ============================================

-- Users can manage (CRUD) their own chat sessions
CREATE POLICY "Users can manage own chat sessions" ON public.chat_sessions
  FOR ALL TO authenticated
  USING (user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text))
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text));

-- Service role (backend) has full access
CREATE POLICY "Service role full access to chat_sessions" ON public.chat_sessions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- CONVERSATIONS POLICIES
-- ============================================

-- Users can access conversations in their own sessions
CREATE POLICY "Users can access own conversations" ON public.conversations
  FOR ALL TO authenticated
  USING (
    session_id IN (
      SELECT id FROM public.chat_sessions
      WHERE user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text)
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.chat_sessions
      WHERE user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text)
    )
  );

-- Service role (backend) has full access
CREATE POLICY "Service role full access to conversations" ON public.conversations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- CLAIMS POLICIES
-- ============================================

-- Users can only view their own claims
CREATE POLICY "Users can view own claims" ON public.claims
  FOR SELECT TO authenticated
  USING (user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text));

-- Service role (backend) has full access
CREATE POLICY "Service role full access to claims" ON public.claims
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- DOCUMENTS POLICIES
-- ============================================

-- Users can view documents attached to their policies or claims
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT TO authenticated
  USING (
    policy_id IN (
      SELECT id FROM public.policies
      WHERE user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text)
    )
    OR
    claim_id IN (
      SELECT id FROM public.claims
      WHERE user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text)
    )
  );

-- Service role (backend) has full access
CREATE POLICY "Service role full access to documents" ON public.documents
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- PAYMENTS POLICIES
-- ============================================

-- Users can only view their own payments
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text));

-- Service role (backend) has full access
CREATE POLICY "Service role full access to payments" ON public.payments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- USER PROFILES POLICIES
-- ============================================

CREATE POLICY "Users can manage own profiles" ON public.user_profiles
  FOR ALL TO authenticated
  USING (user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text))
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text));

CREATE POLICY "Service role full access to user_profiles" ON public.user_profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- USER RATING PROFILES POLICIES
-- ============================================

CREATE POLICY "Users can view own rating profiles" ON public.user_rating_profiles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text));

CREATE POLICY "Service role full access to user_rating_profiles" ON public.user_rating_profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- RATING INSIGHTS POLICIES
-- ============================================

CREATE POLICY "Users can view own rating insights" ON public.rating_insights
  FOR SELECT TO authenticated
  USING (user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text));

CREATE POLICY "Service role full access to rating_insights" ON public.rating_insights
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- AUDIT TRAIL POLICIES
-- ============================================

-- Users can view their own audit trail
CREATE POLICY "Users can view own audit trail" ON public.audit_trail
  FOR SELECT TO authenticated
  USING (user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text));

CREATE POLICY "Service role full access to audit_trail" ON public.audit_trail
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FEEDBACK POLICIES
-- ============================================

CREATE POLICY "Users can manage own feedback" ON public.feedback
  FOR ALL TO authenticated
  USING (user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text))
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text));

CREATE POLICY "Service role full access to feedback" ON public.feedback
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VEHICLE POLICIES (linked via policy_id)
-- ============================================

CREATE POLICY "Users can view own vehicles" ON public.vehicle
  FOR SELECT TO authenticated
  USING (
    policy_id IN (
      SELECT id FROM public.policies
      WHERE user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text)
    )
  );

CREATE POLICY "Service role full access to vehicle" ON public.vehicle
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- DRIVER POLICIES (linked via policy_id)
-- ============================================

CREATE POLICY "Users can view own drivers" ON public.driver
  FOR SELECT TO authenticated
  USING (
    policy_id IN (
      SELECT id FROM public.policies
      WHERE user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text)
    )
  );

CREATE POLICY "Service role full access to driver" ON public.driver
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- DEPENDENTS POLICIES (linked via policy_id)
-- ============================================

CREATE POLICY "Users can view own dependents" ON public.dependents
  FOR SELECT TO authenticated
  USING (
    policy_id IN (
      SELECT id FROM public.policies
      WHERE user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text)
    )
  );

CREATE POLICY "Service role full access to dependents" ON public.dependents
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- LOCATION POLICIES (linked via policy_id)
-- ============================================

CREATE POLICY "Users can view own locations" ON public.location
  FOR SELECT TO authenticated
  USING (
    policy_id IN (
      SELECT id FROM public.policies
      WHERE user_id = (SELECT id FROM public.users WHERE external_id = auth.uid()::text)
    )
  );

CREATE POLICY "Service role full access to location" ON public.location
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- DENY PUBLIC ACCESS (Default deny for anon role)
-- ============================================

-- Revoke all from public/anon on sensitive tables
REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.policies FROM anon;
REVOKE ALL ON public.chat_sessions FROM anon;
REVOKE ALL ON public.conversations FROM anon;
REVOKE ALL ON public.claims FROM anon;
REVOKE ALL ON public.documents FROM anon;
REVOKE ALL ON public.payments FROM anon;
REVOKE ALL ON public.user_profiles FROM anon;
REVOKE ALL ON public.user_rating_profiles FROM anon;
REVOKE ALL ON public.rating_insights FROM anon;
REVOKE ALL ON public.audit_trail FROM anon;
REVOKE ALL ON public.feedback FROM anon;
REVOKE ALL ON public.vehicle FROM anon;
REVOKE ALL ON public.driver FROM anon;
REVOKE ALL ON public.dependents FROM anon;
REVOKE ALL ON public.location FROM anon;

-- ============================================
-- VERIFICATION QUERIES
-- Run these to verify RLS is working
-- ============================================

-- Check RLS is enabled on all tables
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('users', 'policies', 'chat_sessions', 'conversations', 'claims', 'documents', 'payments');

-- Check policies exist
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
