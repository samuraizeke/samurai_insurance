// backend/server.ts
// Main Express server with security hardening

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';

// Load environment variables first
dotenv.config();

import { supabase } from './lib/supabase';
import { logger, requestLogger, setRequestContext } from './lib/logger';

// Security middleware imports
import { requireAuth, optionalAuth } from './middleware/auth';
import {
  generalLimiter,
  chatLimiter,
  uploadLimiter,
  sessionLimiter
} from './middleware/rateLimiter';
import {
  chatRequestSchema,
  createSessionSchema,
  renameSessionSchema,
  deleteSessionSchema,
  getUserSessionsQuerySchema,
  uploadPolicyBodySchema,
  validateRequest
} from './lib/validation';

// NOTE: GCP Workload Identity is used in Cloud Run - no credentials file needed
// The service automatically uses the attached service account
// Only use GOOGLE_CREDENTIALS_BASE64 for local development
if (process.env.NODE_ENV === 'development' && process.env.GOOGLE_CREDENTIALS_BASE64) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const os = require('os');

  const credentials = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
  const credentialsPath = path.join(os.tmpdir(), 'gcp-credentials.json');
  fs.writeFileSync(credentialsPath, credentials, { mode: 0o600 }); // Restrict file permissions
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
  logger.info('Development mode: Using credentials file');
}

import { handleSamChatWithMCP } from './agents/sam';
import {
  handleDocumentUpload,
  getPendingPolicyResponse,
  getUserPolicies,
  deleteUserPolicy,
  renameUserPolicy,
  PolicyType,
  StoredPolicy,
  fetchUserDocumentsFromDatabase,
  deleteDocumentFromDatabase,
  updateDocumentCarrierInDatabase,
  loadUserDocumentsToCache
} from './services/document-upload';
import { generateSessionSummary, regenerateSummary } from './services/session-summary';
import feedbackRoutes from './routes/feedback';

const app = express();
const port = process.env.PORT || 8080;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for Cloud Run (required for rate limiting to work correctly)
// This tells Express to trust the X-Forwarded-For header from the load balancer
app.set('trust proxy', 1);

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/heic',
      'image/heif',
      'image/webp',
      'application/pdf'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload a PDF or image (JPG, PNG, HEIC, WebP).'));
    }
  }
});

// ============================================
// CORS Configuration (Security Hardened)
// ============================================
const allowedOrigins = isProduction
  ? [
      'https://joinsamurai.com',
      'https://www.joinsamurai.com',
      process.env.FRONTEND_URL,
    ].filter(Boolean) as string[]
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://joinsamurai.com',
      'https://www.joinsamurai.com',
      process.env.FRONTEND_URL,
    ].filter(Boolean) as string[];

// In development, also allow ngrok domains for mobile testing
const isNgrokOrigin = (origin: string) =>
  !isProduction && origin.endsWith('.ngrok-free.dev');

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || isNgrokOrigin(origin)) {
      return callback(null, true);
    }
    // Log rejected origins for monitoring
    logger.security(`CORS rejected origin: ${origin}`, { rejectedOrigin: origin });
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));

// Add request ID and structured logging middleware
app.use(requestLogger);

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Mount feedback routes
app.use('/api/feedback', feedbackRoutes);

// ============================================
// HEALTH CHECK (Public)
// ============================================
app.get('/', (req, res) => {
  res.send('Samurai Insurance Backend is active and healthy');
});

// Diagnostic endpoint (development only)
app.get('/api/diagnostics', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json({
    env: process.env.NODE_ENV,
    hasGoogleCredsBase64: !!process.env.GOOGLE_CREDENTIALS_BASE64,
    hasGoogleAppCreds: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    googleAppCredsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    gcsBucket: process.env.GCS_BUCKET_NAME,
    projectId: process.env.GOOGLE_PROJECT_ID,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// DOCUMENT UPLOAD ENDPOINT (Authenticated)
// ============================================
app.post('/api/upload-policy', uploadLimiter, requireAuth, upload.single('document'), async (req, res) => {
  try {
    logger.info('Incoming document upload');

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate body fields
    const [validatedBody, bodyErrors] = validateRequest(uploadPolicyBodySchema, req.body);
    if (bodyErrors) {
      return res.status(400).json(bodyErrors);
    }

    const { buffer, originalname, mimetype } = req.file;
    const sessionId = validatedBody.sessionId || `session_${Date.now()}`;

    // Use authenticated user ID (prevents IDOR)
    const userId = req.user!.id;
    setRequestContext(req.requestId!, userId);

    logger.info('Processing document upload', { fileName: originalname, mimeType: mimetype, sessionId });

    const result = await handleDocumentUpload(buffer, originalname, mimetype, sessionId, userId);

    logger.info('Document upload processing completed', { success: result.success });

    if (result.success) {
      logger.info('Sending success response to client');
      res.json({
        success: true,
        message: "Great news! I've analyzed your policy document. Here's what I found:\n\n" + result.analysis,
        analysis: result.analysis
      });
      logger.info('Success response sent');
    } else {
      logger.error('Sending error response to client', { error: result.error });
      res.status(400).json({
        success: false,
        error: result.error
      });
      logger.info('Error response sent');
    }

  } catch (error) {
    logger.error('Error in upload endpoint', error);
    // Log detailed error information for debugging
    if (error instanceof Error) {
      logger.error('Detailed error info', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    res.status(500).json({
      error: 'Document processing failed. Please try again.',
      // In development, include error details
      ...(process.env.NODE_ENV === 'development' && error instanceof Error ? {
        debug: error.message
      } : {})
    });
  }
});

// Multer error handler - must come immediately after upload route
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Only handle multer errors for upload endpoints
  if (req.path === '/api/upload-policy') {
    // Check if it's a multer error
    if (error instanceof multer.MulterError) {
      logger.error('Multer error during upload', {
        code: error.code,
        field: error.field,
        message: error.message
      });

      // Return user-friendly error messages
      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          return res.status(400).json({
            error: 'File too large. Maximum file size is 20MB.'
          });
        case 'LIMIT_UNEXPECTED_FILE':
          return res.status(400).json({
            error: 'Unexpected file field. Please use the "document" field.'
          });
        default:
          return res.status(400).json({
            error: 'File upload error. Please try again.'
          });
      }
    }

    // Handle custom fileFilter errors
    if (error.message && error.message.includes('Invalid file type')) {
      logger.error('Invalid file type uploaded', { message: error.message });
      return res.status(400).json({
        error: error.message
      });
    }

    // Other errors during upload
    logger.error('Upload endpoint error', error);
    return res.status(500).json({
      error: 'Upload failed. Please try again.',
      ...(process.env.NODE_ENV === 'development' && error instanceof Error ? {
        debug: error.message
      } : {})
    });
  }

  // Pass to next error handler
  next(error);
});

// ============================================
// POLICY STATUS ENDPOINT (Public - no sensitive data)
// ============================================
app.get('/api/policy-status', (req, res) => {
  const pending = getPendingPolicyResponse();

  if (pending) {
    logger.info('Delivering pending policy analysis to frontend');
    res.json({
      ready: true,
      analysis: pending.analysis,
      message: "Great news! I've analyzed your policy. Here's what I found:\n\n" + pending.analysis
    });
  } else {
    res.json({ ready: false });
  }
});

// ============================================
// USER POLICIES ENDPOINT (Authenticated)
// ============================================
app.get('/api/users/:userId/policies', requireAuth, async (req, res) => {
  try {
    // Use authenticated user ID (req.user.id is verified by middleware)
    const userId = req.user!.id;

    // First try to fetch from database (source of truth) - only policy documents
    const dbResult = await fetchUserDocumentsFromDatabase(userId, { policyDocumentsOnly: true });

    if (dbResult.success && dbResult.documents && dbResult.documents.length > 0) {
      // Load into cache for faster access in chat
      await loadUserDocumentsToCache(userId);

      // Return database documents
      const policies = dbResult.documents.map(doc => ({
        id: doc.id,
        policyType: doc.policy_type as PolicyType,
        carrier: doc.carrier_name || 'Unknown',
        analysis: doc.analysis_summary || '',
        uploadedAt: doc.uploaded_at,
        fileName: doc.file_name,
        gcsUri: doc.gcs_uri
      }));

      logger.info('Returning user policies from database', { policyCount: policies.length });
      return res.json({ policies });
    }

    // Fallback to in-memory store for backwards compatibility
    const policiesMap = getUserPolicies(userId);

    if (!policiesMap || policiesMap.size === 0) {
      return res.json({ policies: [] });
    }

    // Convert Map to array format for frontend
    const policies: Array<{
      id?: number;
      policyType: PolicyType;
      carrier: string;
      analysis: string;
      uploadedAt: string;
      fileName: string;
      gcsUri?: string;
    }> = [];

    policiesMap.forEach((policy: StoredPolicy, policyType: PolicyType) => {
      policies.push({
        id: policy.rawData?.documentId,
        policyType,
        carrier: policy.carrier,
        analysis: policy.analysis,
        uploadedAt: policy.rawData?.uploadedAt || new Date(policy.timestamp).toISOString(),
        fileName: policy.rawData?.fileName || 'Unknown',
        gcsUri: policy.rawData?.gcsUri
      });
    });

    // Sort by most recent first
    policies.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    logger.info('Returning user policies from cache', { policyCount: policies.length });
    res.json({ policies });

  } catch (error) {
    logger.error('Error fetching user policies', error);
    res.status(500).json({ error: 'Failed to fetch policies. Please try again.' });
  }
});

// Delete a specific policy (Authenticated)
// Supports both by policyType (legacy) and by documentId (new)
app.delete('/api/users/:userId/policies/:identifier', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { identifier } = req.params;

    // Check if identifier is a document ID (numeric) or policy type
    const documentId = parseInt(identifier, 10);
    const isDocumentId = !isNaN(documentId);

    if (isDocumentId) {
      // Delete by document ID from database
      const dbResult = await deleteDocumentFromDatabase(userId, documentId);

      if (dbResult.success) {
        // Also clear from cache - need to find and remove the policy
        const policiesMap = getUserPolicies(userId);
        if (policiesMap) {
          for (const [policyType, policy] of policiesMap.entries()) {
            if (policy.rawData?.documentId === documentId) {
              deleteUserPolicy(userId, policyType);
              break;
            }
          }
        }

        logger.info('Deleted user document', { userId, documentId });
        return res.json({ success: true, message: 'Policy deleted successfully' });
      } else {
        return res.status(404).json({ error: 'Document not found or already deleted' });
      }
    }

    // Legacy: Delete by policy type
    const policyType = identifier;
    const validPolicyTypes = ['auto', 'home', 'renters', 'umbrella', 'life', 'health', 'other'];
    if (!validPolicyTypes.includes(policyType)) {
      return res.status(400).json({ error: 'Invalid policy type or document ID' });
    }

    // Get the document ID from cache to also delete from database
    const policy = getUserPolicies(userId)?.get(policyType as PolicyType);
    if (policy?.rawData?.documentId) {
      await deleteDocumentFromDatabase(userId, policy.rawData.documentId);
    }

    const deleted = deleteUserPolicy(userId, policyType as PolicyType);

    if (deleted) {
      logger.info('Deleted user policy', { userId, policyType });
      res.json({ success: true, message: 'Policy deleted successfully' });
    } else {
      res.status(404).json({ error: 'Policy not found' });
    }

  } catch (error) {
    logger.error('Error deleting policy', error);
    res.status(500).json({ error: 'Failed to delete policy. Please try again.' });
  }
});

// Rename a policy (update carrier name) (Authenticated)
// Supports both by policyType (legacy) and by documentId (new)
app.patch('/api/users/:userId/policies/:identifier', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { identifier } = req.params;
    const { carrier } = req.body;

    if (!carrier || typeof carrier !== 'string' || carrier.trim().length === 0) {
      return res.status(400).json({ error: 'Carrier name is required' });
    }

    const trimmedCarrier = carrier.trim();

    // Check if identifier is a document ID (numeric) or policy type
    const documentId = parseInt(identifier, 10);
    const isDocumentId = !isNaN(documentId);

    if (isDocumentId) {
      // Update by document ID in database
      const dbResult = await updateDocumentCarrierInDatabase(userId, documentId, trimmedCarrier);

      if (dbResult.success) {
        // Also update in cache
        const policiesMap = getUserPolicies(userId);
        if (policiesMap) {
          for (const [policyType, policy] of policiesMap.entries()) {
            if (policy.rawData?.documentId === documentId) {
              renameUserPolicy(userId, policyType, trimmedCarrier);
              break;
            }
          }
        }

        logger.info('Updated user document carrier', { userId, documentId, newCarrier: trimmedCarrier });
        return res.json({ success: true, message: 'Policy updated successfully' });
      } else {
        return res.status(404).json({ error: 'Document not found' });
      }
    }

    // Legacy: Update by policy type
    const policyType = identifier;
    const validPolicyTypes = ['auto', 'home', 'renters', 'umbrella', 'life', 'health', 'other'];
    if (!validPolicyTypes.includes(policyType)) {
      return res.status(400).json({ error: 'Invalid policy type or document ID' });
    }

    // Get the document ID from cache to also update database
    const policy = getUserPolicies(userId)?.get(policyType as PolicyType);
    if (policy?.rawData?.documentId) {
      await updateDocumentCarrierInDatabase(userId, policy.rawData.documentId, trimmedCarrier);
    }

    const renamed = renameUserPolicy(userId, policyType as PolicyType, trimmedCarrier);

    if (renamed) {
      logger.info('Renamed user policy', { userId, policyType, newCarrier: trimmedCarrier });
      res.json({ success: true, message: 'Policy updated successfully' });
    } else {
      res.status(404).json({ error: 'Policy not found' });
    }

  } catch (error) {
    logger.error('Error renaming policy', error);
    res.status(500).json({ error: 'Failed to update policy. Please try again.' });
  }
});

// ============================================
// CHAT SESSION ENDPOINTS
// ============================================

// Create a new chat session (Authenticated)
app.post('/api/chat-sessions', sessionLimiter, requireAuth, async (req, res) => {
  try {
    // Validate request body
    const [validatedData, validationErrors] = validateRequest(createSessionSchema, {
      ...req.body,
      userId: req.user!.id // Force authenticated user ID
    });

    if (validationErrors) {
      return res.status(400).json(validationErrors);
    }

    const { userId, topicId, policyId, claimId } = validatedData;

    // Look up the internal user ID from external_id (Supabase auth ID)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('external_id', userId)
      .single();

    let internalUserId = userData?.id;

    // If user doesn't exist in our users table, create them
    if (!internalUserId) {
      logger.info('Creating user record for authenticated user');

      // Get user info from Supabase auth
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          external_id: userId,
          name: authUser?.user?.user_metadata?.full_name ||
                authUser?.user?.user_metadata?.name ||
                'User',
          email: authUser?.user?.email || `${userId.slice(0, 8)}@auth.local`,
          // Password hash is required by schema but not used for Supabase auth users
          password_hash: 'supabase_auth_managed'
        })
        .select('id')
        .single();

      if (createError) {
        logger.error('Failed to create user', createError);
        return res.status(500).json({ error: 'Failed to create user record' });
      }
      internalUserId = newUser.id;
    }

    // Create new chat session
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: internalUserId,
        topic_id: topicId || null,
        policy_id: policyId || null,
        claim_id: claimId || null,
        started_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        total_messages: 0,
        active: true
      })
      .select('id, session_uuid')
      .single();

    if (sessionError) {
      logger.error('Failed to create chat session', sessionError);
      return res.status(500).json({ error: 'Failed to create chat session' });
    }

    logger.info('Created chat session', { sessionUuid: session.session_uuid });
    res.json({
      sessionId: session.id,
      sessionUuid: session.session_uuid
    });

  } catch (error) {
    logger.error('Error creating chat session', error);
    res.status(500).json({ error: 'Failed to create session. Please try again.' });
  }
});

// Get chat history for a session (Authenticated)
// Supports pagination: ?limit=50&before=<timestamp> for loading older messages
app.get('/api/chat-sessions/:sessionId/messages', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    // Pagination params: limit defaults to 50, before is optional cursor
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before as string | undefined;

    // Look up internal user ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('external_id', userId)
      .single();

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify session belongs to this user (authorization check)
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (!session || session.user_id !== userData.id) {
      return res.status(403).json({ error: 'Not authorized to view this session' });
    }

    // Build query with pagination - fetch most recent messages first
    let query = supabase
      .from('conversations')
      .select('id, message, timestamp, intent, entities')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    // If 'before' cursor provided, get messages older than that timestamp
    if (before) {
      query = query.lt('timestamp', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      logger.error('Failed to fetch chat history', error);
      return res.status(500).json({ error: 'Failed to fetch chat history' });
    }

    // Reverse to get chronological order (oldest first) for display
    const chronologicalMessages = (messages || []).reverse();

    // Transform to frontend format
    const formattedMessages = chronologicalMessages.map((msg, index) => ({
      id: msg.id.toString(),
      content: msg.message,
      role: index % 2 === 0 ? 'user' : 'assistant',
      timestamp: msg.timestamp,
      intent: msg.intent,
      entities: msg.entities
    }));

    // Include pagination metadata
    const hasMore = messages && messages.length === limit;
    const oldestTimestamp = chronologicalMessages.length > 0
      ? chronologicalMessages[0].timestamp
      : null;

    res.json({
      messages: formattedMessages,
      pagination: {
        hasMore,
        oldestTimestamp,
        limit
      }
    });

  } catch (error) {
    logger.error('Error fetching chat history', error);
    res.status(500).json({ error: 'Failed to fetch chat history. Please try again.' });
  }
});

// Rename a chat session (Authenticated)
app.patch('/api/chat-sessions/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Validate request body
    const [validatedData, validationErrors] = validateRequest(renameSessionSchema, {
      ...req.body,
      userId: req.user!.id
    });

    if (validationErrors) {
      return res.status(400).json(validationErrors);
    }

    const { summary } = validatedData;
    const userId = req.user!.id;

    // Look up internal user ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('external_id', userId)
      .single();

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify session belongs to this user
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.user_id !== userData.id) {
      return res.status(403).json({ error: 'Not authorized to rename this session' });
    }

    // Update the summary
    const { error: updateError } = await supabase
      .from('chat_sessions')
      .update({ summary: summary.trim() })
      .eq('id', sessionId);

    if (updateError) {
      logger.error('Failed to rename session', updateError);
      return res.status(500).json({ error: 'Failed to rename session' });
    }

    logger.info('Renamed chat session', { sessionId });
    res.json({ success: true, message: 'Session renamed successfully' });

  } catch (error) {
    logger.error('Error renaming chat session', error);
    res.status(500).json({ error: 'Failed to rename session. Please try again.' });
  }
});

// Soft delete a chat session (Authenticated)
app.delete('/api/chat-sessions/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Validate request body
    const [, validationErrors] = validateRequest(deleteSessionSchema, {
      ...req.body,
      userId: req.user!.id
    });

    if (validationErrors) {
      return res.status(400).json(validationErrors);
    }

    const userId = req.user!.id;

    // Look up internal user ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('external_id', userId)
      .single();

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify session belongs to this user
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.user_id !== userData.id) {
      return res.status(403).json({ error: 'Not authorized to delete this session' });
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('chat_sessions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (deleteError) {
      logger.error('Failed to soft delete session', deleteError);
      return res.status(500).json({ error: 'Failed to delete session' });
    }

    logger.info('Soft deleted chat session', { sessionId });
    res.json({ success: true, message: 'Session deleted successfully' });

  } catch (error) {
    logger.error('Error deleting chat session', error);
    res.status(500).json({ error: 'Failed to delete session. Please try again.' });
  }
});

// Get user's recent chat sessions (Authenticated)
app.get('/api/users/:userId/chat-sessions', requireAuth, async (req, res) => {
  try {
    // Use authenticated user ID (prevents IDOR)
    const userId = req.user!.id;

    // Validate query params
    const [queryData] = validateRequest(getUserSessionsQuerySchema, req.query);
    const limit = queryData?.limit ?? 10;

    // Look up internal user ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('external_id', userId)
      .single();

    if (!userData) {
      return res.json({ sessions: [] });
    }

    // Fetch sessions that are not soft-deleted
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('id, session_uuid, started_at, last_message_at, total_messages, conversation_context, summary, active')
      .eq('user_id', userData.id)
      .is('deleted_at', null)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch user sessions', error);
      return res.status(500).json({ error: 'Failed to fetch sessions' });
    }

    if (!sessions || sessions.length === 0) {
      return res.json({ sessions: [] });
    }

    // Optimization: Only fetch messages for sessions without summaries (avoid N+1 queries)
    const sessionsNeedingSummary = sessions.filter(s => !s.summary);
    const sessionIdsNeedingSummary = sessionsNeedingSummary.map(s => s.id);

    // Batch fetch first messages for sessions needing summaries (single query instead of N queries)
    let firstMessagesBySession: Record<number, string> = {};
    if (sessionIdsNeedingSummary.length > 0) {
      // Use a raw query to get the first message per session efficiently
      const { data: firstMessages } = await supabase
        .from('conversations')
        .select('session_id, message')
        .in('session_id', sessionIdsNeedingSummary)
        .order('timestamp', { ascending: true });

      // Group by session_id, taking only the first message for each
      if (firstMessages) {
        const seen = new Set<number>();
        for (const msg of firstMessages) {
          if (!seen.has(msg.session_id)) {
            firstMessagesBySession[msg.session_id] = msg.message;
            seen.add(msg.session_id);
          }
        }
      }
    }

    // Generate summaries for sessions that need them (in parallel)
    const summaryPromises = sessionsNeedingSummary.map(async (session) => {
      const firstMessage = firstMessagesBySession[session.id];
      if (firstMessage) {
        const summary = await generateSessionSummary(session.id, [{ message: firstMessage }]);
        return { sessionId: session.id, summary };
      }
      return { sessionId: session.id, summary: null };
    });

    const generatedSummaries = await Promise.all(summaryPromises);
    const summaryMap = new Map(generatedSummaries.map(s => [s.sessionId, s.summary]));

    // Build final response
    const sessionsWithPreviews = sessions.map(session => ({
      ...session,
      first_message: firstMessagesBySession[session.id] || null,
      summary: session.summary || summaryMap.get(session.id) || "New conversation"
    }));

    res.json({ sessions: sessionsWithPreviews });

  } catch (error) {
    logger.error('Error fetching user sessions', error);
    res.status(500).json({ error: 'Failed to fetch sessions. Please try again.' });
  }
});

// ============================================
// CHAT ENDPOINT (Authenticated with optional support)
// ============================================
app.post('/api/chat', chatLimiter, optionalAuth, async (req, res) => {
  try {
    // Validate request body
    const [validatedData, validationErrors] = validateRequest(chatRequestSchema, req.body);

    if (validationErrors) {
      return res.status(400).json(validationErrors);
    }

    const { message, history, sessionId } = validatedData;

    // Use authenticated user ID if available, otherwise undefined
    const userId = req.user?.id;
    if (userId) {
      setRequestContext(req.requestId!, userId);
    }

    logger.info('Received chat message', {
      messagePreview: message.substring(0, 100),
      authenticated: !!userId,
      sessionId: sessionId || null
    });

    // SECURITY: Require authentication for session persistence (prevents session injection)
    if (sessionId && !req.user) {
      return res.status(401).json({
        error: 'Authentication required to save chat to session'
      });
    }

    // SECURITY: Verify session ownership before writing
    let verifiedSessionId: number | undefined = undefined;
    if (sessionId && req.user) {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('external_id', req.user.id)
        .single();

      if (userData) {
        const { data: session } = await supabase
          .from('chat_sessions')
          .select('user_id')
          .eq('id', sessionId)
          .single();

        if (session && session.user_id === userData.id) {
          verifiedSessionId = sessionId;
        } else {
          logger.security('Session ownership mismatch: user tried to write to unauthorized session', { attemptedSessionId: sessionId });
          return res.status(403).json({ error: 'Not authorized to write to this session' });
        }
      }
    }

    // Save user message to database (only if session ownership verified)
    if (verifiedSessionId) {
      try {
        await supabase
          .from('conversations')
          .insert({
            session_id: verifiedSessionId,
            message: message,
            language: 'en',
            channel: 'web',
            timestamp: new Date().toISOString()
          });
      } catch (dbError) {
        logger.warn('Failed to save user message', { error: dbError });
      }
    }

    // Call Agent Sam (with optional MCP database access)
    const enableMCP = process.env.ENABLE_MCP_DATABASE === 'true';
    logger.info('Routing to Agent Sam', { enableMCP, hasUserId: !!userId });
    const finalResponse = await handleSamChatWithMCP(message, history || [], userId, { enableMCP });

    logger.info('Sam completed, sending response');

    // Save assistant response to database (only if session ownership verified)
    if (verifiedSessionId) {
      try {
        await supabase
          .from('conversations')
          .insert({
            session_id: verifiedSessionId,
            message: finalResponse,
            language: 'en',
            channel: 'web',
            timestamp: new Date().toISOString()
          });

        // Update session metadata
        const messageCount = (history?.length || 0) + 2;
        await supabase
          .from('chat_sessions')
          .update({
            last_message_at: new Date().toISOString(),
            total_messages: messageCount
          })
          .eq('id', verifiedSessionId);

        // Generate summary after first message exchange
        if (!history || history.length === 0) {
          regenerateSummary(verifiedSessionId).catch(err => {
            logger.warn('Failed to generate session summary', { error: err });
          });
        }
      } catch (dbError) {
        logger.warn('Failed to save assistant message', { error: dbError });
      }
    }

    res.json({ response: finalResponse });

  } catch (error) {
    logger.error('Critical error in /chat endpoint', error);
    // Never expose internal error details
    res.status(500).json({
      error: 'An unexpected error occurred. Please try again.'
    });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

// Global error handler for uncaught errors in routes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled route error', error, { path: req.path, method: req.method });
  res.status(500).json({
    error: 'An unexpected error occurred. Please try again.'
  });
});

// In production, let the container restart on uncaught exceptions
// In development, keep running for easier debugging
if (isProduction) {
  process.on('uncaughtException', (error) => {
    logger.critical('Uncaught Exception - exiting', error);
    process.exit(1); // Let container orchestrator restart
  });

  process.on('unhandledRejection', (reason) => {
    logger.critical('Unhandled Rejection - exiting', reason as Error);
    process.exit(1);
  });
} else {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception (dev mode - continuing)', error);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection (dev mode - continuing)', reason as Error);
  });
}

// ============================================
// START SERVER
// ============================================
const server = app.listen(port, () => {
  logger.info('Server started', {
    port,
    environment: isProduction ? 'production' : 'development',
    allowedOrigins
  });
});

server.on('error', (error) => {
  logger.critical('Server error', error);
});
// test # Small change
