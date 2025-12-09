// backend/services/session-summary.ts
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import { supabase } from '../lib/supabase';

dotenv.config();

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;

if (!PROJECT_ID) {
    console.error('❌ GOOGLE_PROJECT_ID environment variable is not set');
    throw new Error('Missing GOOGLE_PROJECT_ID environment variable');
}

// Initialize Vertex AI with Gemini Flash for quick summaries
const vertexAI = new VertexAI({
    project: PROJECT_ID,
    location: 'us-central1',
});

const model = vertexAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
});

/**
 * Get or generate a summary for a chat session.
 * First checks the database, then generates if not found.
 */
export async function getOrGenerateSessionSummary(
    sessionId: number,
    messages: { message: string; }[]
): Promise<string> {
    // First, check if summary already exists in database
    const { data: session } = await supabase
        .from('chat_sessions')
        .select('summary')
        .eq('id', sessionId)
        .single();

    if (session?.summary) {
        return session.summary;
    }

    // If no messages, return a default (don't save yet)
    if (!messages || messages.length === 0) {
        return "New conversation";
    }

    // Generate a new summary
    const summary = await generateSummaryFromMessages(messages);

    // Save to database for future use
    await saveSummaryToDatabase(sessionId, summary);

    return summary;
}

/**
 * Generate a 4-5 word summary using AI
 */
async function generateSummaryFromMessages(
    messages: { message: string; }[]
): Promise<string> {
    // Get first few messages for context (limit to first 3 messages, 500 chars each)
    const contextMessages = messages
        .slice(0, 3)
        .map(m => m.message.substring(0, 500))
        .join('\n');

    try {
        const prompt = `Based on these chat messages from an insurance advisor conversation, generate a very short title (4-5 words max) that describes what the conversation is about. Just respond with the title, nothing else.

Messages:
${contextMessages}

Title:`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const summary = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Insurance inquiry";

        // Clean up the summary (remove quotes, limit length)
        let cleanSummary = summary
            .replace(/^["']|["']$/g, '') // Remove surrounding quotes
            .replace(/^Title:\s*/i, '') // Remove "Title:" prefix if present
            .trim();

        // Ensure it's not too long (max 50 chars for DB column)
        if (cleanSummary.length > 50) {
            cleanSummary = cleanSummary.substring(0, 47) + "...";
        }

        return cleanSummary;
    } catch (error) {
        console.error('Failed to generate session summary:', error);
        // Fallback: use first message truncated
        const firstMessage = messages[0]?.message || "Insurance inquiry";
        return firstMessage.length > 30
            ? firstMessage.substring(0, 27) + "..."
            : firstMessage;
    }
}

/**
 * Save summary to database
 */
async function saveSummaryToDatabase(sessionId: number, summary: string): Promise<void> {
    try {
        await supabase
            .from('chat_sessions')
            .update({ summary })
            .eq('id', sessionId);
        console.log(`💾 Saved summary for session ${sessionId}: "${summary}"`);
    } catch (error) {
        console.error('Failed to save summary to database:', error);
    }
}

/**
 * Clear/regenerate summary for a session (call when conversation topic might have changed)
 */
export async function regenerateSummary(sessionId: number): Promise<string | null> {
    // Fetch messages for this session
    const { data: messages } = await supabase
        .from('conversations')
        .select('message')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true })
        .limit(3);

    if (!messages || messages.length === 0) {
        return null;
    }

    // Generate new summary
    const summary = await generateSummaryFromMessages(messages);

    // Save to database
    await saveSummaryToDatabase(sessionId, summary);

    return summary;
}

// Keep the old function name as an alias for backwards compatibility
export const generateSessionSummary = getOrGenerateSessionSummary;
