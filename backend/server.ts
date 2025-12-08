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

// Decode base64 credentials and write to temp file for Google SDK
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    const credentials = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
    const credentialsPath = path.join(os.tmpdir(), 'gcp-credentials.json');
    fs.writeFileSync(credentialsPath, credentials);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
}

import { handleSamChat } from './agents/sam';
import { handleDocumentUpload, getPendingPolicyResponse } from './services/document-upload';

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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
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

// --- 4. CHAT ENDPOINT ---
// The main entry point for the Agent Logic
app.post('/chat', async (req, res) => {
  try {
    const { message, history, userId } = req.body;

    // 1. Basic Validation
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log(`\n💬 Received User Message: "${message}"`);
    if (userId) {
      console.log(`👤 User ID: ${userId}`);
    }

    // 2. Call Agent Sam (The Customer-Facing Advisor)
    // Sam decides if this needs Uri's analysis or can be handled directly
    console.log("👉 Routing to Agent Sam...");
    const finalResponse = await handleSamChat(message, history || [], userId);

    console.log("✅ Sam completed. Sending final response.");

    // 3. Send Final Response
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
