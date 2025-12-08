-- Samurai Insurance Database Schema
-- Run this in Supabase SQL Editor
-- Tables are ordered by foreign key dependencies

-- ============================================
-- TIER 1: Independent Tables (No Foreign Keys)
-- ============================================

-- Users table (link external_id to Supabase auth.users.id)
CREATE TABLE IF NOT EXISTS public.users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  external_id character varying UNIQUE,  -- Store Supabase auth.users.id here
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  avatar_url text,
  phone character varying,
  date_of_birth date,
  address text,
  mbi character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  external_id character varying UNIQUE,
  name character varying NOT NULL,
  email character varying,
  phone character varying,
  license_number character varying,
  agency_name character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agents_pkey PRIMARY KEY (id)
);

-- Carrier table
CREATE TABLE IF NOT EXISTS public.carrier (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  external_id character varying UNIQUE,
  name character varying NOT NULL,
  provider_type character varying,
  contact_info text,
  address text,
  website text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT carrier_pkey PRIMARY KEY (id)
);

-- Insurance types table
CREATE TABLE IF NOT EXISTS public.insurance_types (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT insurance_types_pkey PRIMARY KEY (id)
);

-- Chat topics table
CREATE TABLE IF NOT EXISTS public.chat_topics (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  description text,
  category character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_topics_pkey PRIMARY KEY (id)
);

-- Integration logs table (independent)
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  source character varying NOT NULL,
  entity_type character varying,
  entity_id bigint,
  status character varying DEFAULT 'pending'::character varying,
  message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT integration_logs_pkey PRIMARY KEY (id)
);

-- ============================================
-- TIER 2: Tables with Single Dependencies
-- ============================================

-- Plans table (depends on: insurance_types, carrier)
CREATE TABLE IF NOT EXISTS public.plans (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  insurance_type_id bigint NOT NULL,
  id_carrier bigint,
  name character varying NOT NULL,
  description text,
  coverage_details text,
  monthly_premium numeric,
  deductible numeric,
  max_coverage numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT plans_pkey PRIMARY KEY (id),
  CONSTRAINT plans_insurance_type_id_fkey FOREIGN KEY (insurance_type_id) REFERENCES public.insurance_types(id),
  CONSTRAINT plans_id_carrier_fkey FOREIGN KEY (id_carrier) REFERENCES public.carrier(id)
);

-- Pull table (depends on: users, agents)
CREATE TABLE IF NOT EXISTS public.pull (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  external_id character varying UNIQUE,
  user_id bigint,
  assignee_id bigint,
  status character varying DEFAULT 'initiated'::character varying,
  source character varying,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  notes text,
  CONSTRAINT pull_pkey PRIMARY KEY (id),
  CONSTRAINT pull_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT pull_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.agents(id)
);

-- User profiles table (depends on: users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint,
  profile_name character varying NOT NULL,
  profile_type character varying DEFAULT 'individual'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- User rating profiles table (depends on: users)
CREATE TABLE IF NOT EXISTS public.user_rating_profiles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint,
  loss_free_years integer DEFAULT 0,
  good_driver_eligible boolean DEFAULT false,
  multi_policy_eligible boolean DEFAULT false,
  last_updated timestamp with time zone DEFAULT now(),
  CONSTRAINT user_rating_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_rating_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Rating insights table (depends on: users)
CREATE TABLE IF NOT EXISTS public.rating_insights (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint,
  insight_type character varying,
  insight_data jsonb,
  affects_rating boolean DEFAULT true,
  extracted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rating_insights_pkey PRIMARY KEY (id),
  CONSTRAINT rating_insights_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Audit trail table (depends on: users)
CREATE TABLE IF NOT EXISTS public.audit_trail (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint,
  entity_type character varying,
  entity_id bigint,
  action character varying,
  changes jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_trail_pkey PRIMARY KEY (id),
  CONSTRAINT audit_trail_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ============================================
-- TIER 3: Policies and Related Tables
-- ============================================

-- Policies table (depends on: pull, users, plans, carrier)
CREATE TABLE IF NOT EXISTS public.policies (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  external_id character varying UNIQUE,
  pull_id bigint,
  user_id bigint NOT NULL,
  plan_id bigint NOT NULL,
  policy_number character varying NOT NULL UNIQUE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status character varying DEFAULT 'active'::character varying,
  total_premium numeric,
  carrier_id bigint,
  application_id character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT policies_pkey PRIMARY KEY (id),
  CONSTRAINT policies_pull_id_fkey FOREIGN KEY (pull_id) REFERENCES public.pull(id),
  CONSTRAINT policies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT policies_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id),
  CONSTRAINT policies_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.carrier(id)
);

-- Claims table (depends on: policies, users, carrier)
CREATE TABLE IF NOT EXISTS public.claims (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  external_id character varying UNIQUE,
  policy_id bigint,
  user_id bigint,
  carrier_id bigint,
  claim_number character varying UNIQUE,
  claim_type character varying,
  description text,
  claim_date timestamp with time zone DEFAULT now(),
  amount_requested numeric,
  amount_approved numeric,
  status character varying DEFAULT 'pending'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT claims_pkey PRIMARY KEY (id),
  CONSTRAINT claims_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id),
  CONSTRAINT claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT claims_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.carrier(id)
);

-- ============================================
-- TIER 4: Policy-Related Detail Tables
-- ============================================

-- Location table (depends on: policies)
CREATE TABLE IF NOT EXISTS public.location (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  policy_id bigint,
  external_id character varying UNIQUE,
  address_line text,
  city character varying,
  state character varying,
  postal_code character varying,
  country character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT location_pkey PRIMARY KEY (id),
  CONSTRAINT location_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id)
);

-- Vehicle table (depends on: policies)
CREATE TABLE IF NOT EXISTS public.vehicle (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  external_id character varying UNIQUE,
  policy_id bigint,
  vin character varying,
  make character varying,
  model character varying,
  year integer,
  usage character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vehicle_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id)
);

-- Driver table (depends on: policies)
CREATE TABLE IF NOT EXISTS public.driver (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  external_id character varying UNIQUE,
  policy_id bigint,
  name character varying,
  license_number character varying,
  date_of_birth date,
  gender character varying,
  marital_status character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT driver_pkey PRIMARY KEY (id),
  CONSTRAINT driver_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id)
);

-- Dependents table (depends on: policies)
CREATE TABLE IF NOT EXISTS public.dependents (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  policy_id bigint,
  name character varying NOT NULL,
  relationship character varying,
  date_of_birth date,
  gender character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dependents_pkey PRIMARY KEY (id),
  CONSTRAINT dependents_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id)
);

-- Additional interests table (depends on: policies)
CREATE TABLE IF NOT EXISTS public.additional_interests (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  policy_id bigint,
  name character varying,
  relationship character varying,
  type character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT additional_interests_pkey PRIMARY KEY (id),
  CONSTRAINT additional_interests_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id)
);

-- Documents table (depends on: policies, claims)
CREATE TABLE IF NOT EXISTS public.documents (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  policy_id bigint,
  claim_id bigint,
  file_url text NOT NULL,
  file_type character varying,
  file_name character varying,
  file_size integer,
  purpose character varying,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id),
  CONSTRAINT documents_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claims(id)
);

-- Payments table (depends on: policies, users)
CREATE TABLE IF NOT EXISTS public.payments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  policy_id bigint,
  user_id bigint,
  payment_date timestamp with time zone DEFAULT now(),
  amount numeric,
  payment_method character varying,
  transaction_id character varying,
  status character varying DEFAULT 'completed'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id),
  CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Policy forms table (depends on: policies)
CREATE TABLE IF NOT EXISTS public.policy_forms (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  policy_id bigint,
  form_name character varying,
  version character varying,
  fields jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT policy_forms_pkey PRIMARY KEY (id),
  CONSTRAINT policy_forms_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id)
);

-- Policy renewals table (depends on: policies)
CREATE TABLE IF NOT EXISTS public.policy_renewals (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  policy_id bigint,
  renewal_date date NOT NULL,
  status character varying DEFAULT 'pending'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT policy_renewals_pkey PRIMARY KEY (id),
  CONSTRAINT policy_renewals_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id)
);

-- Policy sources table (depends on: policies, pull)
CREATE TABLE IF NOT EXISTS public.policy_sources (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  policy_id bigint,
  pull_id bigint,
  source_type character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT policy_sources_pkey PRIMARY KEY (id),
  CONSTRAINT policy_sources_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id),
  CONSTRAINT policy_sources_pull_id_fkey FOREIGN KEY (pull_id) REFERENCES public.pull(id)
);

-- Monitoring table (depends on: policies)
CREATE TABLE IF NOT EXISTS public.monitoring (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  policy_id bigint,
  event_type character varying,
  event_status character varying,
  detected_at timestamp with time zone DEFAULT now(),
  details jsonb,
  CONSTRAINT monitoring_pkey PRIMARY KEY (id),
  CONSTRAINT monitoring_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id)
);

-- ============================================
-- TIER 5: Nested Detail Tables
-- ============================================

-- Dwelling table (depends on: location)
CREATE TABLE IF NOT EXISTS public.dwelling (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  location_id bigint,
  dwelling_type character varying,
  year_built integer,
  square_feet integer,
  roof_type character varying,
  construction_type character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dwelling_pkey PRIMARY KEY (id),
  CONSTRAINT dwelling_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id)
);

-- Enrichment property data table (depends on: location)
CREATE TABLE IF NOT EXISTS public.enrichment_property_data (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  location_id bigint,
  home_value numeric,
  roof_condition character varying,
  construction_material character varying,
  raw_data jsonb,
  CONSTRAINT enrichment_property_data_pkey PRIMARY KEY (id),
  CONSTRAINT enrichment_property_data_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id)
);

-- Vehicle coverage table (depends on: vehicle)
CREATE TABLE IF NOT EXISTS public.vehicle_coverage (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  vehicle_id bigint,
  coverage_type character varying,
  coverage_limit numeric,
  deductible numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vehicle_coverage_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_coverage_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicle(id)
);

-- Driving record table (depends on: driver)
CREATE TABLE IF NOT EXISTS public.driving_record (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  driver_id bigint,
  incident_type character varying,
  incident_date date,
  points integer,
  description text,
  CONSTRAINT driving_record_pkey PRIMARY KEY (id),
  CONSTRAINT driving_record_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.driver(id)
);

-- Enrichment driver license table (depends on: driver)
CREATE TABLE IF NOT EXISTS public.enrichment_driver_license (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  driver_id bigint,
  license_class character varying,
  expiration_date date,
  state character varying,
  issued_date date,
  raw_data jsonb,
  CONSTRAINT enrichment_driver_license_pkey PRIMARY KEY (id),
  CONSTRAINT enrichment_driver_license_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.driver(id)
);

-- ============================================
-- TIER 6: Tables with Multiple Dependencies
-- ============================================

-- Dwelling coverage table (depends on: dwelling)
CREATE TABLE IF NOT EXISTS public.dwelling_coverage (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  dwelling_id bigint,
  coverage_type character varying,
  coverage_amount numeric,
  deductible numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dwelling_coverage_pkey PRIMARY KEY (id),
  CONSTRAINT dwelling_coverage_dwelling_id_fkey FOREIGN KEY (dwelling_id) REFERENCES public.dwelling(id)
);

-- Mortgagees table (depends on: policies, dwelling, vehicle)
CREATE TABLE IF NOT EXISTS public.mortgagees (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  entity_name character varying,
  contact_info text,
  policy_id bigint,
  dwelling_id bigint,
  vehicle_id bigint,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mortgagees_pkey PRIMARY KEY (id),
  CONSTRAINT mortgagees_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id),
  CONSTRAINT mortgagees_dwelling_id_fkey FOREIGN KEY (dwelling_id) REFERENCES public.dwelling(id),
  CONSTRAINT mortgagees_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicle(id)
);

-- Profile members table (depends on: user_profiles, users)
CREATE TABLE IF NOT EXISTS public.profile_members (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  profile_id bigint,
  member_user_id bigint,
  role character varying DEFAULT 'member'::character varying,
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profile_members_pkey PRIMARY KEY (id),
  CONSTRAINT profile_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.user_profiles(id),
  CONSTRAINT profile_members_member_user_id_fkey FOREIGN KEY (member_user_id) REFERENCES public.users(id)
);

-- ============================================
-- TIER 7: Pull-Related Tables
-- ============================================

-- API syncs table (depends on: pull)
CREATE TABLE IF NOT EXISTS public.api_syncs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  pull_id bigint,
  sync_type character varying,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  status character varying DEFAULT 'success'::character varying,
  details jsonb,
  CONSTRAINT api_syncs_pkey PRIMARY KEY (id),
  CONSTRAINT api_syncs_pull_id_fkey FOREIGN KEY (pull_id) REFERENCES public.pull(id)
);

-- Pull assignee table (depends on: pull)
CREATE TABLE IF NOT EXISTS public.pull_assignee (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  pull_id bigint,
  name character varying,
  email character varying,
  role character varying,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pull_assignee_pkey PRIMARY KEY (id),
  CONSTRAINT pull_assignee_pull_id_fkey FOREIGN KEY (pull_id) REFERENCES public.pull(id)
);

-- Pull funnel table (depends on: pull)
CREATE TABLE IF NOT EXISTS public.pull_funnel (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  pull_id bigint,
  step_name character varying,
  step_status character varying DEFAULT 'pending'::character varying,
  completed_at timestamp with time zone,
  CONSTRAINT pull_funnel_pkey PRIMARY KEY (id),
  CONSTRAINT pull_funnel_pull_id_fkey FOREIGN KEY (pull_id) REFERENCES public.pull(id)
);

-- ============================================
-- TIER 8: Quote Tables
-- ============================================

-- Quote requests table (depends on: users, policies)
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint,
  policy_id bigint,
  requested_at timestamp with time zone DEFAULT now(),
  status character varying DEFAULT 'pending'::character varying,
  details jsonb,
  CONSTRAINT quote_requests_pkey PRIMARY KEY (id),
  CONSTRAINT quote_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT quote_requests_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id)
);

-- Quotes table (depends on: quote_requests, carrier)
CREATE TABLE IF NOT EXISTS public.quotes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  quote_request_id bigint,
  carrier_id bigint,
  premium numeric,
  coverage_details text,
  valid_until date,
  accepted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quotes_pkey PRIMARY KEY (id),
  CONSTRAINT quotes_quote_request_id_fkey FOREIGN KEY (quote_request_id) REFERENCES public.quote_requests(id),
  CONSTRAINT quotes_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.carrier(id)
);

-- ============================================
-- TIER 9: Chat & Conversation Tables
-- ============================================

-- Chat sessions table (depends on: users, chat_topics, policies, claims)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  topic_id bigint,
  policy_id bigint,
  claim_id bigint,
  session_uuid uuid DEFAULT gen_random_uuid(),
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  last_message_at timestamp with time zone,
  rating_avg numeric,
  total_messages integer DEFAULT 0,
  active boolean DEFAULT true,
  conversation_context character varying,
  deleted_at timestamp with time zone DEFAULT NULL,
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT chat_sessions_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.chat_topics(id),
  CONSTRAINT chat_sessions_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id),
  CONSTRAINT chat_sessions_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claims(id)
);

-- Conversations table (depends on: chat_sessions, users)
CREATE TABLE IF NOT EXISTS public.conversations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  session_id bigint NOT NULL,
  user_id bigint,
  message text NOT NULL,
  language character varying DEFAULT 'es'::character varying,
  channel character varying DEFAULT 'web'::character varying,
  timestamp timestamp with time zone DEFAULT now(),
  intent character varying,
  confidence_score numeric,
  entities jsonb,
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id),
  CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Conversation embeddings table (depends on: conversations)
-- Modified: Using embedding_id (text) to store Google embedding reference instead of vector type
CREATE TABLE IF NOT EXISTS public.conversation_embeddings (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  conversation_id bigint,
  content_summary text,
  embedding_id character varying,  -- Reference to Google embedding ID
  embedding_metadata jsonb,        -- Optional: store additional embedding info
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversation_embeddings_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_embeddings_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);

-- Feedback table (depends on: conversations, users)
CREATE TABLE IF NOT EXISTS public.feedback (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  conversation_id bigint,
  user_id bigint,
  rating smallint CHECK (rating >= 1 AND rating <= 5),
  comment text,
  feedback_type character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT feedback_pkey PRIMARY KEY (id),
  CONSTRAINT feedback_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ============================================
-- INDEXES (for better query performance)
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_external_id ON public.users(external_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Policies indexes
CREATE INDEX IF NOT EXISTS idx_policies_user_id ON public.policies(user_id);
CREATE INDEX IF NOT EXISTS idx_policies_policy_number ON public.policies(policy_number);
CREATE INDEX IF NOT EXISTS idx_policies_status ON public.policies(status);

-- Claims indexes
CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON public.claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_user_id ON public.claims(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);

-- Chat sessions indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_uuid ON public.chat_sessions(session_uuid);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_deleted_at ON public.chat_sessions(deleted_at);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON public.conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_policy_id ON public.documents(policy_id);
CREATE INDEX IF NOT EXISTS idx_documents_claim_id ON public.documents(claim_id);

-- Vehicle indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_policy_id ON public.vehicle(policy_id);

-- Driver indexes
CREATE INDEX IF NOT EXISTS idx_driver_policy_id ON public.driver(policy_id);

-- Location indexes
CREATE INDEX IF NOT EXISTS idx_location_policy_id ON public.location(policy_id);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_policy_id ON public.payments(policy_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.users IS 'User profiles linked to Supabase auth via external_id';
COMMENT ON COLUMN public.users.external_id IS 'Maps to auth.users.id from Supabase Auth';
COMMENT ON TABLE public.conversation_embeddings IS 'Stores references to Google embeddings for conversations';
COMMENT ON COLUMN public.conversation_embeddings.embedding_id IS 'Reference ID to embedding stored in Google';
