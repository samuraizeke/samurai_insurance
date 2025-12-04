// backend/webhooks/canopy.ts
import crypto from 'crypto';
import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';

dotenv.config();

// --- CONFIGURATION ---
const CANOPY_TEAM_ID = process.env.CANOPY_TEAM_ID;
const CANOPY_CLIENT_ID = process.env.CANOPY_CLIENT_ID;
const CANOPY_API_SECRET = process.env.CANOPY_API_SECRET;
const CANOPY_WEBHOOK_SECRET = process.env.CANOPY_WEBHOOK_SECRET; // For webhook signature verification
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME; // The bucket feeding your DataStore
const CANOPY_BASE_URL = 'https://app.usecanopy.com/api/v1.0.0';

// Initialize Google Cloud Storage
const storage = new Storage();

/**
 * Verifies the webhook signature from Canopy Connect
 * Reference: https://docs.usecanopy.com/reference/verifying-webhook-signatures
 */
export function verifyCanopySignature(
    signature: string,
    timestamp: string,
    body: string,
    secret: string
): boolean {
    try {
        // 1. Build the signed payload: timestamp + "." + JSON body
        const signedPayload = `${timestamp}.${body}`;

        // 2. Compute HMAC-SHA256 with the webhook signing secret
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(signedPayload)
            .digest('hex');

        // 3. Use constant-time comparison to prevent timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        console.error('Error verifying signature:', error);
        return false;
    }
}

/**
 * Parses the canopy-signature header
 * Format: "t=1645638136,s=18416697e8e8d0c07fde9dc16d410f9263193b631fd889ad81ald298bcd9241f"
 */
export function parseCanopySignature(header: string): { timestamp: string; signature: string } | null {
    try {
        const pairs = header.split(',');
        const data: any = {};

        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            data[key] = value;
        }

        if (!data.t || !data.s) {
            return null;
        }

        return {
            timestamp: data.t,
            signature: data.s
        };
    } catch (error) {
        console.error('Error parsing signature header:', error);
        return null;
    }
}

/**
 * Fetches pull data from Canopy API
 */
async function fetchPullData(pullId: string): Promise<any> {
    if (!CANOPY_TEAM_ID || !CANOPY_CLIENT_ID || !CANOPY_API_SECRET) {
        throw new Error('Canopy credentials not configured');
    }

    const url = `${CANOPY_BASE_URL}/teams/${CANOPY_TEAM_ID}/pulls/${pullId}`;

    console.log(`=� Fetching pull data from: ${url}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'x-canopy-client-id': CANOPY_CLIENT_ID,
            'x-canopy-client-secret': CANOPY_API_SECRET,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch pull data: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Downloads a document as PDF from Canopy
 */
async function downloadDocument(pullId: string, documentId: string): Promise<Buffer> {
    if (!CANOPY_TEAM_ID || !CANOPY_CLIENT_ID || !CANOPY_API_SECRET) {
        throw new Error('Canopy credentials not configured');
    }

    const url = `${CANOPY_BASE_URL}/teams/${CANOPY_TEAM_ID}/pulls/${pullId}/documents/${documentId}/pdf`;

    console.log(`=� Downloading document from: ${url}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'x-canopy-client-id': CANOPY_CLIENT_ID,
            'x-canopy-client-secret': CANOPY_API_SECRET
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to download document: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

/**
 * Uploads a document to Google Cloud Storage
 * The bucket should be the one that feeds your Vertex AI DataStore
 */
async function uploadToGCS(buffer: Buffer, fileName: string): Promise<string> {
    if (!GCS_BUCKET_NAME) {
        throw new Error('GCS_BUCKET_NAME not configured in environment variables');
    }

    const bucket = storage.bucket(GCS_BUCKET_NAME);
    const file = bucket.file(fileName);

    console.log(` Uploading to GCS: ${GCS_BUCKET_NAME}/${fileName}`);

    await file.save(buffer, {
        contentType: 'application/pdf',
        metadata: {
            source: 'canopy-connect',
            uploadedAt: new Date().toISOString()
        }
    });

    console.log(` Successfully uploaded: ${fileName}`);
    return `gs://${GCS_BUCKET_NAME}/${fileName}`;
}

/**
 * Main handler for Canopy webhook events
 * This processes the COMPLETE event and uploads all documents to GCS
 */
export async function handleCanopyWebhook(eventType: string, payload: any): Promise<void> {
    console.log(`\n>� Received Canopy webhook: ${eventType}`);

    // We only care about COMPLETE events (all documents ready)
    if (eventType !== 'COMPLETE') {
        console.log(`� Skipping event type: ${eventType}`);
        return;
    }

    try {
        const pullId = payload.pull_id;

        if (!pullId) {
            throw new Error('No pull_id in webhook payload');
        }

        console.log(`=� Processing pull: ${pullId}`);

        // 1. Fetch the pull data from Canopy API
        const pullData = await fetchPullData(pullId);

        console.log(`=� Pull data retrieved. Checking for documents...`);

        // 2. Extract documents from the pull data
        // The structure may vary, but typically documents are in pullData.documents
        const documents = pullData.documents || pullData.data?.documents || [];

        if (documents.length === 0) {
            console.log('� No documents found in pull');
            return;
        }

        console.log(`=� Found ${documents.length} document(s) to process`);

        // 3. Download and upload each document to GCS
        for (const doc of documents) {
            const documentId = doc.id || doc.document_id;
            const documentType = doc.type || doc.document_type || 'policy';

            if (!documentId) {
                console.warn('� Document missing ID, skipping');
                continue;
            }

            try {
                // Download the PDF from Canopy
                const pdfBuffer = await downloadDocument(pullId, documentId);

                // Generate a unique filename in the Policies directory
                // Format: Policies/[timestamp]_[pullId]_[documentType]_[documentId].pdf
                const timestamp = Date.now();
                const fileName = `Policies/${timestamp}_${pullId}_${documentType}_${documentId}.pdf`;

                // Upload to GCS
                await uploadToGCS(pdfBuffer, fileName);

            } catch (error) {
                console.error(`L Error processing document ${documentId}:`, error);
                // Continue with other documents even if one fails
            }
        }

        console.log(` Completed processing pull ${pullId}`);

    } catch (error) {
        console.error('L Error in handleCanopyWebhook:', error);
        throw error; // Re-throw so the webhook endpoint can return appropriate status
    }
}
