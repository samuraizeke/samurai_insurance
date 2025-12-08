// backend/server.ts
import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';

dotenv.config();

// Decode base64 credentials and write to temp file for Google SDK
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    const credentials = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
    const credentialsPath = path.join(os.tmpdir(), 'gcp-credentials.json');
    fs.writeFileSync(credentialsPath, credentials);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
}

import { handleUriChat } from './agents/uri';

const app = express();
// Google Cloud Run automatically sets the PORT env var to 8080
const port = process.env.PORT || 8080;

// Middleware to parse incoming JSON data
app.use(express.json());

// --- 1. HEALTH CHECK (Critical for Cloud Run) ---
// If this endpoint doesn't return 200 OK, Google kills the container.
app.get('/', (req, res) => {
    res.send('Samurai Insurance Backend is active 🥷');
});

// --- 2. CHAT ENDPOINT ---
// The frontend sends messages here. We pass them to Agent Uri.
app.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        console.log(`Received chat: ${message}`);

        // Call the Agent Logic
        const response = await handleUriChat(message, history || []);

        res.json({ response });

    } catch (error) {
        console.error('Error in /chat endpoint:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});