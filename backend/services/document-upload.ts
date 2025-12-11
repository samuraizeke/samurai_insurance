// backend/services/document-upload.ts
import { Storage } from '@google-cloud/storage';
import { VertexAI } from '@google-cloud/vertexai';
import vision from '@google-cloud/vision';
import dotenv from 'dotenv';

dotenv.config();

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;

if (!PROJECT_ID) {
    console.error('❌ GOOGLE_PROJECT_ID environment variable is not set');
    throw new Error('Missing GOOGLE_PROJECT_ID environment variable');
}

// Initialize Google Cloud clients
const storage = new Storage();
const visionClient = new vision.ImageAnnotatorClient();

const vertexAI = new VertexAI({
    project: PROJECT_ID,
    location: 'us-central1',
});

const model = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
});

const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;

// Policy types we support
export type PolicyType = 'auto' | 'home' | 'renters' | 'umbrella' | 'life' | 'health' | 'other';

// Structure for stored policy data
export interface StoredPolicy {
    policyType: PolicyType;
    carrier: string;
    analysis: string;
    rawData: any;
    timestamp: number;
}

// In-memory store for analyzed policies (keyed by visitorId, then by policyType)
// Structure: Map<visitorId, Map<policyType, StoredPolicy>>
// In production, use a database like Supabase
export const userPolicies: Map<string, Map<PolicyType, StoredPolicy>> = new Map();

// Legacy support - single policy store (deprecated, use userPolicies)
export const analyzedPolicies: Map<string, { analysis: string; rawData: any; timestamp: number }> = new Map();

// Store for pending responses that should be delivered to the user
let pendingPolicyResponse: { analysis: string; rawData: any; timestamp: number } | null = null;

/**
 * Detects the policy type from the analysis text
 */
export function detectPolicyType(analysisText: string): PolicyType {
    const lowerAnalysis = analysisText.toLowerCase();

    // Check for specific policy type indicators
    if (lowerAnalysis.includes('auto') || lowerAnalysis.includes('vehicle') ||
        lowerAnalysis.includes('car insurance') || lowerAnalysis.includes('automobile') ||
        lowerAnalysis.includes('collision') || lowerAnalysis.includes('comprehensive coverage')) {
        return 'auto';
    }
    if (lowerAnalysis.includes('homeowner') || lowerAnalysis.includes('home insurance') ||
        lowerAnalysis.includes('dwelling') || lowerAnalysis.includes('ho-3') ||
        lowerAnalysis.includes('ho-5') || lowerAnalysis.includes('property coverage')) {
        return 'home';
    }
    if (lowerAnalysis.includes('renter') || lowerAnalysis.includes('tenant')) {
        return 'renters';
    }
    if (lowerAnalysis.includes('umbrella') || lowerAnalysis.includes('excess liability')) {
        return 'umbrella';
    }
    if (lowerAnalysis.includes('life insurance') || lowerAnalysis.includes('term life') ||
        lowerAnalysis.includes('whole life') || lowerAnalysis.includes('death benefit')) {
        return 'life';
    }
    if (lowerAnalysis.includes('health insurance') || lowerAnalysis.includes('medical') ||
        lowerAnalysis.includes('hmo') || lowerAnalysis.includes('ppo')) {
        return 'health';
    }

    return 'other';
}

/**
 * Extracts the carrier name from the analysis text
 */
function extractCarrier(analysisText: string): string {
    // Look for common patterns like "**Carrier**: XYZ" or "Carrier: XYZ"
    const carrierMatch = analysisText.match(/\*{0,2}(?:carrier|insurance company|insurer|underwritten by)\*{0,2}[:\s]+([A-Za-z0-9\s&.,'()-]+?)(?:\n|$|,(?!\s*Inc)|\.(?!\s*[A-Z])|Coverage)/i);
    if (carrierMatch) {
        return carrierMatch[1].trim();
    }
    return 'Unknown';
}

/**
 * Stores a policy for a user by type
 */
export function storeUserPolicy(userId: string, policy: StoredPolicy): void {
    if (!userPolicies.has(userId)) {
        userPolicies.set(userId, new Map());
    }
    userPolicies.get(userId)!.set(policy.policyType, policy);
    console.log(`📁 Stored ${policy.policyType} policy for user ${userId} (carrier: ${policy.carrier})`);
}

/**
 * Gets all policies for a user
 */
export function getUserPolicies(userId: string): Map<PolicyType, StoredPolicy> | null {
    return userPolicies.get(userId) || null;
}

/**
 * Gets a specific policy type for a user
 */
export function getUserPolicyByType(userId: string, policyType: PolicyType): StoredPolicy | null {
    const policies = userPolicies.get(userId);
    return policies?.get(policyType) || null;
}

/**
 * Gets a list of all policy types a user has uploaded
 */
export function getUserPolicyTypes(userId: string): PolicyType[] {
    const policies = userPolicies.get(userId);
    return policies ? Array.from(policies.keys()) : [];
}

/**
 * Gets the most recent policy analysis (for chat to use) - legacy support
 */
export function getLatestPolicyAnalysis(): { analysis: string; rawData: any } | null {
    if (analyzedPolicies.size === 0) return null;

    // Get the most recently analyzed policy
    let latest: { analysis: string; rawData: any; timestamp: number } | null = null;
    for (const policy of analyzedPolicies.values()) {
        if (!latest || policy.timestamp > latest.timestamp) {
            latest = policy;
        }
    }

    return latest ? { analysis: latest.analysis, rawData: latest.rawData } : null;
}

/**
 * Gets the best matching policy for a user query
 * Returns the policy that matches the query context, or the most recent if no specific match
 */
export function getPolicyForQuery(userId: string, query: string): StoredPolicy | null {
    const policies = userPolicies.get(userId);
    if (!policies || policies.size === 0) return null;

    const lowerQuery = query.toLowerCase();

    // Check for explicit policy type references in the query
    if (lowerQuery.includes('auto') || lowerQuery.includes('car') || lowerQuery.includes('vehicle') || lowerQuery.includes('driving')) {
        const autoPolicy = policies.get('auto');
        if (autoPolicy) return autoPolicy;
    }
    if (lowerQuery.includes('home') || lowerQuery.includes('house') || lowerQuery.includes('property') || lowerQuery.includes('dwelling')) {
        const homePolicy = policies.get('home');
        if (homePolicy) return homePolicy;
    }
    if (lowerQuery.includes('rent') || lowerQuery.includes('apartment') || lowerQuery.includes('tenant')) {
        const rentersPolicy = policies.get('renters');
        if (rentersPolicy) return rentersPolicy;
    }
    if (lowerQuery.includes('umbrella') || lowerQuery.includes('excess')) {
        const umbrellaPolicy = policies.get('umbrella');
        if (umbrellaPolicy) return umbrellaPolicy;
    }

    // Return the most recent policy if no specific match
    let mostRecent: StoredPolicy | null = null;
    for (const policy of policies.values()) {
        if (!mostRecent || policy.timestamp > mostRecent.timestamp) {
            mostRecent = policy;
        }
    }
    return mostRecent;
}

/**
 * Gets and clears any pending policy response (one-time delivery)
 */
export function getPendingPolicyResponse(): { analysis: string; rawData: any } | null {
    if (!pendingPolicyResponse) return null;

    const response = {
        analysis: pendingPolicyResponse.analysis,
        rawData: pendingPolicyResponse.rawData
    };
    pendingPolicyResponse = null; // Clear after retrieval
    return response;
}

/**
 * Sets a pending policy response for immediate delivery
 */
export function setPendingPolicyResponse(analysis: string, rawData: any): void {
    pendingPolicyResponse = {
        analysis,
        rawData,
        timestamp: Date.now()
    };
}

/**
 * Extracts text from an image using Google Cloud Vision OCR
 */
async function extractTextFromImage(buffer: Buffer): Promise<string> {
    console.log('🔍 Performing OCR on image...');

    try {
        const [result] = await visionClient.textDetection({
            image: { content: buffer.toString('base64') }
        });

        const detections = result.textAnnotations;
        if (detections && detections.length > 0) {
            // First annotation contains the full text
            const fullText = detections[0].description || '';
            console.log(`✅ OCR extracted ${fullText.length} characters`);
            return fullText;
        }

        console.log('⚠️ No text detected in image');
        return '';
    } catch (error) {
        console.error('❌ OCR error:', error);
        throw new Error('Failed to extract text from image');
    }
}

/**
 * Extracts text from a PDF using Gemini's vision capabilities
 */
async function extractTextFromPDF(buffer: Buffer, mimeType: string): Promise<string> {
    console.log('📄 Extracting text from PDF using Gemini...');

    try {
        const base64Data = buffer.toString('base64');

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    },
                    {
                        text: `Extract ALL text from this insurance document. Include every piece of information you can read:
- Policy numbers
- Coverage types and limits
- Deductibles
- Premium amounts
- Policyholder information
- Effective dates
- Carrier/insurer name
- Any endorsements or riders
- Property or vehicle information
- Liability limits

Return the extracted text in a structured format. Be thorough and include everything visible.`
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
            },
        });

        const extractedText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log(`✅ Extracted ${extractedText.length} characters from PDF`);
        console.log('📋 EXTRACTED TEXT START ===');
        console.log(extractedText);
        console.log('=== EXTRACTED TEXT END');
        return extractedText;
    } catch (error) {
        console.error('❌ PDF extraction error:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

/**
 * Uploads a document to Google Cloud Storage
 */
async function uploadToGCS(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
    if (!GCS_BUCKET_NAME) {
        throw new Error('GCS_BUCKET_NAME not configured in environment variables');
    }

    const bucket = storage.bucket(GCS_BUCKET_NAME);
    const file = bucket.file(fileName);

    console.log(`☁️ Uploading to GCS: ${GCS_BUCKET_NAME}/${fileName}`);

    await file.save(buffer, {
        contentType: contentType,
        metadata: {
            source: 'document-upload',
            uploadedAt: new Date().toISOString()
        }
    });

    console.log(`✅ Successfully uploaded: ${fileName}`);
    return `gs://${GCS_BUCKET_NAME}/${fileName}`;
}

/**
 * Analyzes extracted policy text using AI
 */
async function analyzePolicyText(extractedText: string, fileName: string): Promise<string> {
    console.log('🤖 Analyzing policy document...');

    const prompt = `You are an expert insurance analyst. Analyze this extracted insurance document text and provide a helpful summary.

EXTRACTED DOCUMENT TEXT:
${extractedText}

Please provide:
1. **Policy Type**: What kind of insurance is this? (auto, home, renters, umbrella, etc.)
2. **Carrier**: [Insurance company name only, e.g., "State Farm", "Allstate", "Progressive"]
3. **Coverage Summary**: Key coverages included
4. **Limits**: Important coverage limits (liability, property damage, etc.)
5. **Deductibles**: Any deductibles mentioned
6. **Premium**: Monthly/annual premium if shown
7. **Effective Dates**: Policy period if mentioned
8. **Notable Items**: Any special endorsements, exclusions, or concerns

IMPORTANT: For the Carrier field (#2), output ONLY the insurance company name after the colon (e.g., "2. **Carrier**: State Farm"). Do not include extra text like "The carrier is..." - just the company name.

If any information is unclear or missing, note that. Keep your response concise but comprehensive.`;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2048,
            },
        });

        const analysis = result.response.candidates?.[0]?.content?.parts?.[0]?.text ||
            'Unable to analyze policy document.';

        console.log('✅ Policy analysis complete');
        return analysis;

    } catch (error) {
        console.error('❌ Error analyzing policy:', error);
        throw error;
    }
}

/**
 * Determines the document type based on MIME type
 */
function getDocumentType(mimeType: string): 'image' | 'pdf' | 'unsupported' {
    if (mimeType.startsWith('image/')) {
        return 'image';
    }
    if (mimeType === 'application/pdf') {
        return 'pdf';
    }
    return 'unsupported';
}

/**
 * Main handler for document upload and analysis
 */
export async function handleDocumentUpload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    sessionId: string,
    userId?: string
): Promise<{ success: boolean; analysis?: string; error?: string }> {
    console.log(`\n📤 Processing document upload: ${originalName} (${mimeType})`);
    if (userId) {
        console.log(`👤 Associated with user: ${userId}`);
    }

    const docType = getDocumentType(mimeType);

    if (docType === 'unsupported') {
        return {
            success: false,
            error: 'Unsupported file type. Please upload a PDF or image (JPG, PNG, HEIC).'
        };
    }

    try {
        // 1. Upload to GCS for storage
        const timestamp = Date.now();
        const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const gcsFileName = `Policies/${timestamp}_${sessionId}_${sanitizedName}`;

        await uploadToGCS(buffer, gcsFileName, mimeType);

        // 2. Extract text based on document type
        let extractedText: string;

        if (docType === 'image') {
            extractedText = await extractTextFromImage(buffer);
        } else {
            extractedText = await extractTextFromPDF(buffer, mimeType);
        }

        if (!extractedText || extractedText.length < 50) {
            return {
                success: false,
                error: 'Could not extract enough text from the document. Please ensure the image is clear and contains readable text, or try uploading a different document.'
            };
        }

        // 3. Analyze the extracted text
        const analysis = await analyzePolicyText(extractedText, originalName);

        // 4. Detect policy type and carrier from the analysis
        const policyType = detectPolicyType(analysis);
        const carrier = extractCarrier(analysis);

        // 5. Store the analysis (keyed by userId if available, otherwise sessionId)
        const storageKey = userId || sessionId;
        const rawData = {
            fileName: originalName,
            extractedText,
            gcsPath: gcsFileName,
            uploadedAt: new Date().toISOString(),
            documentType: docType,
            userId: userId || null,
            policyType,
            carrier
        };

        // Store in new multi-policy structure
        const storedPolicy: StoredPolicy = {
            policyType,
            carrier,
            analysis,
            rawData,
            timestamp: Date.now()
        };
        storeUserPolicy(storageKey, storedPolicy);

        // Also store in legacy structure for backwards compatibility
        const policyData = {
            analysis,
            rawData,
            timestamp: Date.now()
        };
        analyzedPolicies.set(storageKey, policyData);
        setPendingPolicyResponse(analysis, policyData.rawData);

        console.log(`✅ Document processed: ${policyType} policy from ${carrier}`);
        console.log(`   Stored for ${userId ? `user ${userId}` : `session ${sessionId}`}`);

        return {
            success: true,
            analysis
        };

    } catch (error) {
        console.error('❌ Error processing document:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process document'
        };
    }
}

/**
 * Clears policy data for a session
 */
export function clearPolicyData(sessionId: string): void {
    analyzedPolicies.delete(sessionId);
}

/**
 * Deletes a specific policy for a user
 */
export function deleteUserPolicy(userId: string, policyType: PolicyType): boolean {
    const policies = userPolicies.get(userId);
    if (!policies) {
        return false;
    }
    const deleted = policies.delete(policyType);
    if (deleted) {
        console.log(`🗑️ Deleted ${policyType} policy for user ${userId}`);
    }
    return deleted;
}

/**
 * Renames a policy by updating its carrier name
 */
export function renameUserPolicy(userId: string, policyType: PolicyType, newCarrier: string): boolean {
    const policies = userPolicies.get(userId);
    if (!policies) {
        return false;
    }
    const policy = policies.get(policyType);
    if (!policy) {
        return false;
    }
    policy.carrier = newCarrier;
    if (policy.rawData) {
        policy.rawData.carrier = newCarrier;
    }
    console.log(`✏️ Renamed ${policyType} policy carrier to "${newCarrier}" for user ${userId}`);
    return true;
}
