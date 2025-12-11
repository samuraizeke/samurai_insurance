-- Migration: Add user_documents table for tracking uploaded documents/attachments
-- This table links users to their documents stored in Google Cloud Storage
-- Supports both policy documents (with AI analysis) and general chat attachments

-- ============================================
-- USER DOCUMENTS TABLE
-- ============================================
-- Stores references to all user-uploaded documents
-- Documents are stored in GCS, this table maintains the link

CREATE TABLE IF NOT EXISTS public.user_documents (
    id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,

    -- User reference (uses external_id from auth.users)
    user_id character varying NOT NULL,

    -- Optional chat session reference (for chat attachments)
    chat_session_id bigint REFERENCES public.chat_sessions(id) ON DELETE SET NULL,

    -- Document identification
    document_type character varying NOT NULL DEFAULT 'policy',
    -- Types: 'policy', 'id_card', 'claim', 'chat_attachment', 'image', 'screenshot', 'other'

    policy_type character varying,  -- 'auto', 'home', 'renters', 'umbrella', 'life', 'health', 'other' (NULL for non-policy uploads)

    -- Upload context
    upload_context character varying DEFAULT 'documents',  -- 'documents', 'chat', 'profile', 'claim_submission'
    description text,  -- User-provided description or context

    -- File information
    file_name character varying NOT NULL,
    file_type character varying,  -- MIME type
    file_size integer,

    -- Google Cloud Storage reference
    gcs_bucket character varying NOT NULL,
    gcs_path character varying NOT NULL,
    gcs_uri character varying GENERATED ALWAYS AS ('gs://' || gcs_bucket || '/' || gcs_path) STORED,

    -- Extracted/analyzed content (primarily for policy documents)
    carrier_name character varying,
    policy_number character varying,
    analysis_summary text,  -- AI-generated analysis
    extracted_data jsonb,   -- Structured data extracted from document

    -- Metadata
    status character varying DEFAULT 'active',  -- 'active', 'archived', 'deleted'
    uploaded_at timestamp with time zone DEFAULT now(),
    analyzed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT user_documents_pkey PRIMARY KEY (id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Index for querying documents by user
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);

-- Index for querying by policy type
CREATE INDEX IF NOT EXISTS idx_user_documents_policy_type ON public.user_documents(policy_type);

-- Index for active documents only
CREATE INDEX IF NOT EXISTS idx_user_documents_status ON public.user_documents(status);

-- Index for querying attachments by chat session
CREATE INDEX IF NOT EXISTS idx_user_documents_chat_session_id ON public.user_documents(chat_session_id)
    WHERE chat_session_id IS NOT NULL;

-- Index for querying by document type
CREATE INDEX IF NOT EXISTS idx_user_documents_document_type ON public.user_documents(document_type);

-- Composite index for common policy query pattern
CREATE INDEX IF NOT EXISTS idx_user_documents_user_policy_type
    ON public.user_documents(user_id, policy_type)
    WHERE status = 'active' AND document_type = 'policy';

-- Composite index for chat attachments
CREATE INDEX IF NOT EXISTS idx_user_documents_user_chat_attachments
    ON public.user_documents(user_id, chat_session_id)
    WHERE status = 'active' AND document_type IN ('chat_attachment', 'image', 'screenshot');

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own documents
CREATE POLICY user_documents_select_own ON public.user_documents
    FOR SELECT
    USING (user_id = auth.uid()::text);

-- Policy: Users can only insert their own documents
CREATE POLICY user_documents_insert_own ON public.user_documents
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can only update their own documents
CREATE POLICY user_documents_update_own ON public.user_documents
    FOR UPDATE
    USING (user_id = auth.uid()::text);

-- Policy: Users can only delete their own documents
CREATE POLICY user_documents_delete_own ON public.user_documents
    FOR DELETE
    USING (user_id = auth.uid()::text);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.user_documents IS 'Tracks all user-uploaded documents including policy documents, chat attachments, and images. Documents are stored in GCS.';
COMMENT ON COLUMN public.user_documents.user_id IS 'References auth.users.id (external_id in users table)';
COMMENT ON COLUMN public.user_documents.chat_session_id IS 'Optional link to chat session for chat attachments';
COMMENT ON COLUMN public.user_documents.document_type IS 'Type: policy, id_card, claim, chat_attachment, image, screenshot, other';
COMMENT ON COLUMN public.user_documents.upload_context IS 'Where upload originated: documents, chat, profile, claim_submission';
COMMENT ON COLUMN public.user_documents.gcs_uri IS 'Auto-generated GCS URI for direct access';
COMMENT ON COLUMN public.user_documents.analysis_summary IS 'AI-generated summary (primarily for policy documents)';
COMMENT ON COLUMN public.user_documents.extracted_data IS 'Structured JSON data extracted from the document';
