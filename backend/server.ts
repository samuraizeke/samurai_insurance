// backend/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';
import multer from 'multer';

// Load environment variables
dotenv.config();

import { supabase } from './lib/supabase';

// Decode base64 credentials and write to temp file for Google SDK
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    const credentials = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
    const credentialsPath = path.join(os.tmpdir(), 'gcp-credentials.json');
    fs.writeFileSync(credentialsPath, credentials);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
}

import { handleSamChat } from './agents/sam';
import { handleDocumentUpload, getPendingPolicyResponse, getUserPolicies, PolicyType, StoredPolicy } from './services/document-upload';
import { generateSessionSummary, regenerateSummary } from './services/session-summary';

const app = express();
// Google Cloud Run sets PORT to 8080 automatically
const port = process.env.PORT || 8080;

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
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

// Middleware to enable CORS (allow frontend to communicate with backend)
const allowedOrigins = [
  'http://localhost:3000',
  'https://joinsamurai.com',
  'https://www.joinsamurai.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Return false instead of error to avoid breaking preflight requests
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Middleware to parse JSON bodies
app.use(express.json());

// --- 1. HEALTH CHECK ---
// Cloud Run needs this to know the service is healthy.
// If this fails, the container restarts.
app.get('/', (req, res) => {
  res.send('Samurai Insurance Backend is active and healthy 🥷');
});

// --- 2. DOCUMENT UPLOAD ENDPOINT ---
// Handles policy document uploads with OCR/parsing
app.post('/api/upload-policy', upload.single('document'), async (req, res) => {
  try {
    console.log('\n📤 Incoming document upload...');

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { buffer, originalname, mimetype } = req.file;
    const sessionId = req.body.sessionId || `session_${Date.now()}`;
    const userId = req.body.userId;

    console.log(`📄 File: ${originalname} (${mimetype})`);
    console.log(`📋 Session: ${sessionId}`);
    if (userId) {
      console.log(`👤 User ID: ${userId}`);
    }

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
    console.error('❌ Error in upload endpoint:', error);
    res.status(500).json({
      error: 'Document processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// --- 3. POLICY STATUS ENDPOINT ---
// Frontend can poll this to check if policy analysis is ready
app.get('/api/policy-status', (req, res) => {
  const pending = getPendingPolicyResponse();

  if (pending) {
    console.log('📄 Delivering pending policy analysis to frontend');
    res.json({
      ready: true,
      analysis: pending.analysis,
      message: "Great news! I've analyzed your policy. Here's what I found:\n\n" + pending.analysis
    });
  } else {
    res.json({ ready: false });
  }
});

// --- 3.5. USER POLICIES ENDPOINT ---
// Get all uploaded policies for a user
app.get('/api/users/:userId/policies', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

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

    console.log(`📋 Returning ${policies.length} policies for user ${userId}`);
    res.json({ policies });

  } catch (error) {
    console.error('❌ Error fetching user policies:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- 4. CHAT SESSION ENDPOINTS ---

// Create a new chat session
app.post('/api/chat-sessions', async (req, res) => {
  try {
    const { userId, topicId, policyId, claimId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Look up the internal user ID from external_id (Supabase auth ID)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('external_id', userId)
      .single();

    let internalUserId = userData?.id;

    // If user doesn't exist in our users table, create them
    if (!internalUserId) {
      console.log(`📝 Creating user record for external_id: ${userId}`);
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          external_id: userId,
          name: 'Chat User',
          email: `${userId}@placeholder.local`,
          password_hash: 'oauth_user'
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Failed to create user:', createError);
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
      console.error('Failed to create chat session:', sessionError);
      return res.status(500).json({ error: 'Failed to create chat session' });
    }

    console.log(`✅ Created chat session: ${session.session_uuid}`);
    res.json({
      sessionId: session.id,
      sessionUuid: session.session_uuid
    });

  } catch (error) {
    console.error('❌ Error creating chat session:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get chat history for a session
app.get('/api/chat-sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: messages, error } = await supabase
      .from('conversations')
      .select('id, message, timestamp, intent, entities')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Failed to fetch chat history:', error);
      return res.status(500).json({ error: 'Failed to fetch chat history' });
    }

    // Transform to frontend format
    const formattedMessages = messages.map((msg, index) => ({
      id: msg.id.toString(),
      content: msg.message,
      role: index % 2 === 0 ? 'user' : 'assistant', // Alternating pattern
      timestamp: msg.timestamp,
      intent: msg.intent,
      entities: msg.entities
    }));

    res.json({ messages: formattedMessages });

  } catch (error) {
    console.error('❌ Error fetching chat history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Rename a chat session
app.patch('/api/chat-sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId, summary } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!summary || typeof summary !== 'string') {
      return res.status(400).json({ error: 'summary is required' });
    }

    // Look up internal user ID to verify ownership
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('external_id', userId)
      .single();

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify the session belongs to this user
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
      console.error('Failed to rename session:', updateError);
      return res.status(500).json({ error: 'Failed to rename session' });
    }

    console.log(`✏️ Renamed chat session ${sessionId} to: "${summary.trim()}"`);
    res.json({ success: true, message: 'Session renamed successfully' });

  } catch (error) {
    console.error('❌ Error renaming chat session:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Soft delete a chat session
app.delete('/api/chat-sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Look up internal user ID to verify ownership
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('external_id', userId)
      .single();

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify the session belongs to this user before deleting
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

    // Soft delete by setting deleted_at timestamp
    const { error: deleteError } = await supabase
      .from('chat_sessions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (deleteError) {
      console.error('Failed to soft delete session:', deleteError);
      return res.status(500).json({ error: 'Failed to delete session' });
    }

    console.log(`🗑️ Soft deleted chat session: ${sessionId}`);
    res.json({ success: true, message: 'Session deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting chat session:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get user's recent chat sessions
app.get('/api/users/:userId/chat-sessions', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    // Look up internal user ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('external_id', userId)
      .single();

    if (!userData) {
      return res.json({ sessions: [] });
    }

    // Fetch sessions that are not soft-deleted (deleted_at is null)
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('id, session_uuid, started_at, last_message_at, total_messages, conversation_context, summary, active')
      .eq('user_id', userData.id)
      .is('deleted_at', null)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch user sessions:', error);
      return res.status(500).json({ error: 'Failed to fetch sessions' });
    }

    // For sessions without summaries, generate them
    const sessionsWithPreviews = await Promise.all(
      (sessions || []).map(async (session) => {
        // Fetch first message for preview
        const { data: messages } = await supabase
          .from('conversations')
          .select('message')
          .eq('session_id', session.id)
          .order('timestamp', { ascending: true })
          .limit(3);

        // If no summary in DB, generate one (this also saves it)
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
    console.error('❌ Error fetching user sessions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- 5. CHAT ENDPOINT ---
// The main entry point for the Agent Logic
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, userId, sessionId } = req.body;

    // 1. Basic Validation
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log(`\n💬 Received User Message: "${message}"`);
    if (userId) {
      console.log(`👤 User ID: ${userId}`);
    }
    if (sessionId) {
      console.log(`📋 Session ID: ${sessionId}`);
    }

    // 2. Save user message to database (if sessionId provided)
    if (sessionId) {
      try {
        await supabase
          .from('conversations')
          .insert({
            session_id: sessionId,
            message: message,
            language: 'en',
            channel: 'web',
            timestamp: new Date().toISOString()
          });
      } catch (dbError) {
        console.error('⚠️ Failed to save user message:', dbError);
        // Continue processing even if save fails
      }
    }

    // 3. Call Agent Sam (The Customer-Facing Advisor)
    // Sam decides if this needs Uri's analysis or can be handled directly
    console.log("👉 Routing to Agent Sam...");
    const finalResponse = await handleSamChat(message, history || [], userId);

    console.log("✅ Sam completed. Sending final response.");

    // 4. Save assistant response to database (if sessionId provided)
    if (sessionId) {
      try {
        await supabase
          .from('conversations')
          .insert({
            session_id: sessionId,
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
          .eq('id', sessionId);

        // Generate summary after first message exchange (when no history yet)
        if (!history || history.length === 0) {
          // Don't await - generate in background to not slow down response
          regenerateSummary(sessionId).catch(err => {
            console.error('⚠️ Failed to generate session summary:', err);
          });
        }
      } catch (dbError) {
        console.error('⚠️ Failed to save assistant message:', dbError);
        // Continue even if save fails
      }
    }

    // 5. Send Final Response
    res.json({ response: finalResponse });

  } catch (error) {
    console.error('❌ Critical Error in /chat endpoint:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Global error handlers to prevent server from crashing
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - keep server running
});

// Start the server
const server = app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

// Keep the process alive
process.stdin.resume();
