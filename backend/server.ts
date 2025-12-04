// backend/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { handleSamChat } from './agents/sam';
import { handleUriChat } from './agents/uri';
import { handleRaiReview } from './agents/rai';
import { handleCanopyWebhook, verifyCanopySignature, parseCanopySignature } from './webhooks/canopy';

// Load environment variables
dotenv.config();

const app = express();
// Google Cloud Run sets PORT to 8080 automatically
const port = process.env.PORT || 8080;

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

// --- 2. CHAT ENDPOINT ---
// The main entry point for the Agent Logic
app.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    // 1. Basic Validation
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log(`\n💬 Received User Message: "${message}"`);

    // 2. Call Agent Sam (The Customer-Facing Advisor)
    // Sam decides if this needs Uri's analysis or can be handled directly
    console.log("👉 Routing to Agent Sam...");
    const finalResponse = await handleSamChat(message, history || []);

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

// --- 3. CANOPY WEBHOOK ENDPOINT ---
// Receives webhook events from Canopy Connect when policy documents are ready
app.post('/api/canopy-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    console.log('\n🪝 Incoming Canopy webhook...');

    // 1. Get the signature from headers
    const signatureHeader = req.headers['canopy-signature'] as string;

    if (!signatureHeader) {
      console.warn('⚠️ No signature header found');
      return res.status(401).json({ error: 'No signature header' });
    }

    // 2. Parse the signature
    const sigData = parseCanopySignature(signatureHeader);

    if (!sigData) {
      console.warn('⚠️ Invalid signature format');
      return res.status(401).json({ error: 'Invalid signature format' });
    }

    // 3. Verify the signature
    const rawBody = req.body.toString('utf8');

    // Debug logging
    console.log('📋 Debug Info:');
    console.log('  - Timestamp:', sigData.timestamp);
    console.log('  - Signature:', sigData.signature);
    console.log('  - Body preview:', rawBody.substring(0, 100) + '...');
    console.log('  - Secret configured:', process.env.CANOPY_WEBHOOK_SECRET ? 'Yes' : 'No');

    const isValid = verifyCanopySignature(
      sigData.signature,
      sigData.timestamp,
      rawBody,
      process.env.CANOPY_WEBHOOK_SECRET || ''
    );

    if (!isValid) {
      console.warn('⚠️ Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Signature verified');

    // 4. Parse the webhook payload
    const payload = JSON.parse(rawBody);
    const eventType = payload.event_type || payload.type;

    // 5. Process the webhook
    await handleCanopyWebhook(eventType, payload);

    // 6. Respond with success
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ Error in webhook endpoint:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});