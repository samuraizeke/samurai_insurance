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

import { handleSamChat } from './agents/sam';
import { handleDocumentUpload, getPendingPolicyResponse, getUserPolicies, deleteUserPolicy, renameUserPolicy, PolicyType, StoredPolicy } from './services/document-upload';
import { generateSessionSummary, regenerateSummary } from './services/session-summary';

const app = express();
const port = process.env.PORT || 8080;
const isProduction = process.env.NODE_ENV === 'production';

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

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
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

// ============================================
// HEALTH CHECK (Public)
// ============================================
app.get('/', (req, res) => {
  res.send('Samurai Insurance Backend is active and healthy');
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

    if (result.success) {
      res.json({
        success: true,
        message: "Great news! I've analyzed your policy document. Here's what I found:\n\n" + result.analysis,
        analysis: result.analysis
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('Error in upload endpoint', error);
    res.status(500).json({
      error: 'Document processing failed. Please try again.'
    });
  }
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

    // Get policies from in-memory store (keyed by external userId)
    const policiesMap = getUserPolicies(userId);

    if (!policiesMap || policiesMap.size === 0) {
      return res.json({ policies: [] });
    }

    // Convert Map to array format for frontend
    const policies: Array<{
      policyType: PolicyType;
      carrier: string;
      analysis: string;
      uploadedAt: string;
      fileName: string;
    }> = [];

    policiesMap.forEach((policy: StoredPolicy, policyType: PolicyType) => {
      policies.push({
        policyType,
        carrier: policy.carrier,
        analysis: policy.analysis,
        uploadedAt: policy.rawData?.uploadedAt || new Date(policy.timestamp).toISOString(),
        fileName: policy.rawData?.fileName || 'Unknown'
      });
    });

    // Sort by most recent first
    policies.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    logger.info('Returning user policies', { policyCount: policies.length });
    res.json({ policies });

  } catch (error) {
    logger.error('Error fetching user policies', error);
    res.status(500).json({ error: 'Failed to fetch policies. Please try again.' });
  }
});

// Delete a specific policy (Authenticated)
app.delete('/api/users/:userId/policies/:policyType', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { policyType } = req.params;

    // Validate policy type
    const validPolicyTypes = ['auto', 'home', 'renters', 'umbrella', 'life', 'health', 'other'];
    if (!validPolicyTypes.includes(policyType)) {
      return res.status(400).json({ error: 'Invalid policy type' });
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
app.patch('/api/users/:userId/policies/:policyType', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { policyType } = req.params;
    const { carrier } = req.body;

    // Validate policy type
    const validPolicyTypes = ['auto', 'home', 'renters', 'umbrella', 'life', 'health', 'other'];
    if (!validPolicyTypes.includes(policyType)) {
      return res.status(400).json({ error: 'Invalid policy type' });
    }

    if (!carrier || typeof carrier !== 'string' || carrier.trim().length === 0) {
      return res.status(400).json({ error: 'Carrier name is required' });
    }

    const renamed = renameUserPolicy(userId, policyType as PolicyType, carrier.trim());

    if (renamed) {
      logger.info('Renamed user policy', { userId, policyType, newCarrier: carrier.trim() });
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
          email: authUser?.user?.email || `${userId.slice(0, 8)}@auth.local`
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
app.get('/api/chat-sessions/:sessionId/messages', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
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

    // Verify session belongs to this user (authorization check)
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (!session || session.user_id !== userData.id) {
      return res.status(403).json({ error: 'Not authorized to view this session' });
    }

    const { data: messages, error } = await supabase
      .from('conversations')
      .select('id, message, timestamp, intent, entities')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (error) {
      logger.error('Failed to fetch chat history', error);
      return res.status(500).json({ error: 'Failed to fetch chat history' });
    }

    // Transform to frontend format
    const formattedMessages = messages.map((msg, index) => ({
      id: msg.id.toString(),
      content: msg.message,
      role: index % 2 === 0 ? 'user' : 'assistant',
      timestamp: msg.timestamp,
      intent: msg.intent,
      entities: msg.entities
    }));

    res.json({ messages: formattedMessages });

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

    // For sessions without summaries, generate them
    const sessionsWithPreviews = await Promise.all(
      (sessions || []).map(async (session) => {
        const { data: messages } = await supabase
          .from('conversations')
          .select('message')
          .eq('session_id', session.id)
          .order('timestamp', { ascending: true })
          .limit(3);

        let summary = session.summary;
        if (!summary && messages && messages.length > 0) {
          summary = await generateSessionSummary(session.id, messages);
        }

        return {
          ...session,
          first_message: messages?.[0]?.message || null,
          summary: summary || "New conversation"
        };
      })
    );

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

    // Call Agent Sam
    logger.info('Routing to Agent Sam');
    const finalResponse = await handleSamChat(message, history || [], userId);

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
