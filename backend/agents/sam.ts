// backend/agents/sam.ts
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import { handleUriChat } from './uri';
import { handleRaiReview } from './rai';
import { getLatestPolicyAnalysis } from '../services/document-upload';

dotenv.config();

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;

// Initialize Vertex AI for US-CENTRAL1 with Gemini 2.5 Flash
const vertexAI = new VertexAI({
    project: PROJECT_ID!,
    location: 'us-central1',
});

const model = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
});

// Helper to clean AI responses
function cleanResponse(text: string, maxSentences: number = 8): string {
    // Remove markdown formatting
    let cleaned = text
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold **text**
        .replace(/\*([^*]+)\*/g, '$1')      // Remove italic *text*
        .replace(/#{1,6}\s/g, '')           // Remove headers
        .replace(/`([^`]+)`/g, '$1')        // Remove code blocks
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove links but keep text

    // Limit sentences (default 8 for more complete responses)
    const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > maxSentences) {
        cleaned = sentences.slice(0, maxSentences).join('. ') + '.';
    }

    return cleaned.trim();
}

export async function handleSamChat(userQuery: string, history: any[], userId?: string) {
    try {
        console.log(`\n💬 Sam received message: "${userQuery}"`);
        if (userId) {
            console.log(`👤 Processing for user: ${userId}`);
        }

        // Quick responses for common queries (no AI needed)
        const lowerQuery = userQuery.toLowerCase().trim();

        // Greetings
        if (/^(hi|hello|hey|yo|sup|what's up|whats up)$/i.test(lowerQuery)) {
            return "Hey! I'm Sam, your insurance advisor. What can I help you with today?";
        }

        // How are you
        if (/how are you|how're you/i.test(lowerQuery)) {
            return "I'm doing great, thanks for asking! How can I help with your insurance needs?";
        }

        // Check if we have policy data available
        const policyData = getLatestPolicyAnalysis();

        // Check if user needs to upload their policy
        const needsPolicyUpload = await checkIfNeedsPolicyUpload(userQuery, history);

        if (needsPolicyUpload) {
            // If we already have policy data, use it to answer
            if (policyData) {
                console.log("📄 Sam: Using existing policy data to answer...");
                const policyResponse = await answerWithPolicyData(userQuery, policyData, history);
                return policyResponse;
            }

            console.log("📄 Sam: User needs to upload their policy document...");
            const uploadResponse = await promptDocumentUpload(userQuery);
            return uploadResponse;
        }

        // First, let Sam decide if this needs Uri's analysis
        const needsAnalysis = await shouldCallUri(userQuery, history);

        if (needsAnalysis) {
            console.log("🔄 Sam: This query needs Uri's analysis...");

            // Call Uri for detailed analysis
            const uriResult = await handleUriChat(userQuery, history);

            // Uri returns either a string (error) or an object {answer, context}
            let uriResponse: string;
            let sourceContext: string;

            if (typeof uriResult === 'string') {
                // Error case - return directly
                return uriResult;
            } else {
                uriResponse = uriResult.answer;
                sourceContext = uriResult.context;
            }

            // Call Rai to review Uri's draft
            console.log("🔍 Sam: Sending to Rai for review...");
            const raiApprovedAnswer = await handleRaiReview(userQuery, uriResponse, sourceContext);

            // Sam now presents Rai's approved analysis in a friendly way
            console.log("✅ Sam: Presenting final answer to user...");
            const finalResponse = await presentFinalAnalysis(userQuery, raiApprovedAnswer, history);
            return finalResponse;
        } else {
            // Simple query - Sam can handle it directly
            console.log("💬 Sam: Handling this directly...");
            const directResponse = await handleDirectly(userQuery, history);
            return directResponse;
        }

    } catch (error) {
        console.error("❌ Error in Agent Sam:", error);
        return "I apologize, but I encountered an error. Please try again or let me know if you need help with something else!";
    }
}

// Check if user needs to upload their policy document
async function checkIfNeedsPolicyUpload(userQuery: string, history: any[]): Promise<boolean> {
    const lowerQuery = userQuery.toLowerCase();

    // ========================================
    // CATEGORY 1: EXPLICIT POLICY REFERENCES
    // ========================================
    const explicitPolicyKeywords = [
        'my policy', 'my coverage', 'my current', 'my plan', 'my insurance',
        'check my', 'view my', 'see my', 'review my', 'analyze my',
        'what do i have', 'what am i', 'am i covered', 'do i have',
        'my limits', 'my deductible', 'my premium', 'my carrier',
        'in my policy', 'on my policy', 'in my coverage',
        'i have coverage', 'i have insurance', 'i have a policy'
    ];

    if (explicitPolicyKeywords.some(keyword => lowerQuery.includes(keyword))) {
        console.log(`✅ POLICY UPLOAD REQUIRED: Explicit policy reference detected`);
        return true;
    }

    // ========================================
    // CATEGORY 2: QUOTE & PRICING REQUESTS
    // ========================================
    const quoteKeywords = [
        'quote', 'quotes', 'pricing', 'price', 'cost', 'how much',
        'give me a quote', 'get a quote', 'need a quote',
        'what would it cost', 'how much would', 'how much does',
        'save money', 'cheaper', 'lower my', 'reduce my',
        'switch', 'compare', 'comparison'
    ];

    if (quoteKeywords.some(keyword => lowerQuery.includes(keyword))) {
        // Check if it's a personalized request (not just "what is the average cost of insurance?")
        const isPersonalized =
            lowerQuery.includes('my') ||
            lowerQuery.includes('i ') ||
            lowerQuery.includes('me ') ||
            lowerQuery.includes('can you') ||
            lowerQuery.includes('could you') ||
            lowerQuery.includes('give') ||
            lowerQuery.includes('get') ||
            lowerQuery.includes('need');

        if (isPersonalized) {
            console.log(`✅ POLICY UPLOAD REQUIRED: Quote/pricing request detected`);
            return true;
        }
    }

    // ========================================
    // CATEGORY 3: COVERAGE ANALYSIS & GAP DETECTION
    // ========================================
    const analysisKeywords = [
        'gap', 'gaps', 'missing', 'underinsured', 'enough coverage',
        'sufficient coverage', 'adequate coverage', 'protected',
        'what am i missing', 'what should i add', 'what do i need',
        'recommend', 'recommendation', 'suggestions',
        'enough protection', 'adequately covered'
    ];

    if (analysisKeywords.some(keyword => lowerQuery.includes(keyword))) {
        // These require personalization - need to see their current policy
        const needsPersonalization =
            lowerQuery.includes('my') ||
            lowerQuery.includes('i ') ||
            lowerQuery.includes('am i') ||
            lowerQuery.includes('do i');

        if (needsPersonalization) {
            console.log(`✅ POLICY UPLOAD REQUIRED: Coverage analysis/gap detection request`);
            return true;
        }
    }

    // ========================================
    // CATEGORY 4: SMART DETECTION (policy/coverage + possessive)
    // ========================================
    const hasPolicyRef = lowerQuery.includes('policy') || lowerQuery.includes('coverage') || lowerQuery.includes('insurance');
    const hasPossessive =
        lowerQuery.includes('my ') ||
        lowerQuery.includes('mine') ||
        lowerQuery.includes('i have') ||
        lowerQuery.includes('i\'m') ||
        lowerQuery.includes('i am') ||
        lowerQuery.includes('do i');

    if (hasPolicyRef && hasPossessive) {
        console.log(`✅ POLICY UPLOAD REQUIRED: Policy reference + possessive detected`);
        return true;
    }

    const prompt = `You are a decision-making assistant. Determine if the user needs to upload their current insurance policy to get accurate help.

Questions that NEED policy upload (return "YES"):
- ANY questions about "my policy", "my coverage", "my insurance", or "my current" coverage
- ANY quote, pricing, or cost requests ("give me a quote", "how much would it cost", "can I save money")
- Coverage gap analysis ("what gaps do I have", "am I underinsured", "what am I missing")
- Personalized recommendations ("what should I add to MY coverage", "do I have enough")
- Questions like "what does my policy cover", "what are my limits", "am I covered for X"
- Requests to review, analyze, or compare their specific policy
- Questions about switching carriers or comparing their current policy
- Claims questions about their specific policy

Questions that DON'T need policy upload (return "NO"):
- Pure education questions with NO personalization ("what is umbrella insurance", "how does a deductible work")
- Hypothetical scenarios about someone else ("what if someone got into an accident")
- General questions about averages or typical coverage ("what's the average home insurance cost")
- Greetings or small talk
- Questions about insurance concepts in the abstract

**IMPORTANT**: When in doubt, return "YES". It's better to ask for policy upload when not needed than to skip it when needed.

Reply with ONLY "YES" or "NO".

User question: "${userQuery}"`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10,
        },
    });

    const decision = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();
    console.log(`🤔 Policy upload check AI decision: ${decision}`);
    return decision === "YES";
}

// Answer questions using the customer's policy data
async function answerWithPolicyData(
    userQuery: string,
    policyData: { analysis: string; rawData: any },
    history: any[]
): Promise<string> {
    console.log("🔍 Answering with policy data...");

    const prompt = `You are Sam, a friendly insurance advisor. The customer has uploaded their insurance policy and you now have access to their coverage details.

CUSTOMER'S POLICY ANALYSIS:
${policyData.analysis}

RAW POLICY DATA:
${JSON.stringify(policyData.rawData, null, 2)}

**Guidelines**:
- Answer their question using the ACTUAL data from their policy
- Be specific - reference their actual coverage limits, deductibles, carrier, etc.
- Keep responses concise (2-3 sentences)
- Use plain text - NO markdown, NO asterisks, NO bold formatting
- If you notice gaps or concerns, mention them briefly
- Be helpful and friendly

${history.length > 0 ? `Previous conversation:\n${history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\n` : ''}

Customer's question: "${userQuery}"

Answer using their specific policy information:`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
        },
    });

    const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I have your policy data but couldn't generate a response. Please try asking again.";

    return cleanResponse(response);
}

// Prompt user to upload their policy document
async function promptDocumentUpload(userQuery: string): Promise<string> {
    const prompt = `You are Sam, a friendly insurance advisor. The user asked about their specific policy.

Your task: Briefly explain they need to upload their insurance documents so you can review their coverage.

**Guidelines**:
- Keep it SHORT (1-2 sentences)
- Explain they can upload a photo of their insurance card, declarations page, or policy PDF
- It's quick and secure
- Use plain text - NO markdown, NO asterisks, NO bold formatting
- Do NOT include any URLs - the upload button appears automatically

Example: "To review your specific coverage, I'll need you to upload your policy documents. You can take a photo of your insurance card or upload your declarations page - it only takes a moment!"

User asked: "${userQuery}"

Create a brief response asking them to upload their policy documents.`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 256,
        },
    });

    let response = result.response.candidates?.[0]?.content?.parts?.[0]?.text ||
        "To review your specific policy, please upload your insurance documents.";

    // Remove any URLs that might have been included
    response = response.replace(/https?:\/\/[^\s]+/g, '').trim();

    // Add a special marker for the frontend to detect and render the upload button
    return response + "\n\n[UPLOAD_POLICY]";
}

// Determine if Uri's analysis is needed
async function shouldCallUri(userQuery: string, history: any[]): Promise<boolean> {
    const prompt = `You are a decision-making assistant. Determine if the user's question needs detailed insurance analysis from Uri.

**IMPORTANT**: This function should ONLY return YES for general insurance education questions that don't require the user's specific policy.

Questions that NEED Uri analysis (return "YES"):
- General insurance education questions ("what is umbrella insurance", "how does coinsurance work")
- Hypothetical coverage scenarios ("what would happen if someone...")
- General state insurance regulations ("what are the minimum requirements in CA")
- Insurance concept explanations ("difference between replacement cost and ACV")
- Non-personalized general recommendations ("what coverage should someone with a $500k home consider")

Questions that DON'T need Uri (return "NO"):
- Simple greetings (hi, hello, how are you)
- Small talk or casual conversation
- Questions about you or your capabilities
- **ANY questions about the user's CURRENT/EXISTING policy** (these should have been caught by policy upload check)
- **ANY quote or pricing requests** (these should have been caught by policy upload check)
- **ANY personalized recommendations** (these should have been caught by policy upload check)
- Questions with "my", "I have", "am I", "do I" combined with policy/coverage/insurance

**Critical**: If this is a personalized question that slipped through, return "NO" (it will be handled as a general question by Sam).

Reply with ONLY "YES" or "NO".

User question: "${userQuery}"`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10,
        },
    });

    const decision = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();
    return decision === "YES";
}

// Handle simple queries directly
async function handleDirectly(userQuery: string, history: any[]): Promise<string> {
    // FINAL SAFETY NET: Catch any policy/quote queries that slipped through
    const lowerQuery = userQuery.toLowerCase();

    // Check for policy/coverage + possessive (last line of defense)
    const hasPolicyRef = lowerQuery.includes('policy') || lowerQuery.includes('coverage') || lowerQuery.includes('insurance');
    const hasPossessive = lowerQuery.includes('my ') || lowerQuery.includes('i have') || lowerQuery.includes('am i') || lowerQuery.includes('do i');
    const hasQuoteRef = lowerQuery.includes('quote') || lowerQuery.includes('price') || lowerQuery.includes('cost');

    if ((hasPolicyRef && hasPossessive) || hasQuoteRef) {
        console.log(`🚨 SAFETY NET: handleDirectly caught policy/quote query that slipped through!`);
        console.log(`   Query: "${userQuery}"`);
        return "To help you with that, I'll need you to upload your policy documents first. You can take a photo of your insurance card or upload your declarations page!\n\n[UPLOAD_POLICY]";
    }

    const prompt = `You are Sam, a friendly insurance advisor. Keep responses SHORT and conversational—2-3 sentences max.

**Style**:
- Talk like a helpful friend, not a textbook
- Get straight to the point
- Use plain text - NO markdown, NO asterisks, NO bold formatting
- Ask follow-up questions when needed
- Skip long explanations unless asked

**Knowledge**:
- Auto & home insurance expert
- Use analogies when helpful
- Define terms simply if needed

Be warm, concise, and helpful.

${history.length > 0 ? `Previous conversation:\n${history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\n` : ''}User: ${userQuery}

Respond briefly and naturally:`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
        },
    });

    const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm here to help! What can I assist you with today?";

    return cleanResponse(response);
}

// Present final analysis in a friendly way
async function presentFinalAnalysis(originalQuery: string, finalAnswer: string, history: any[]): Promise<string> {
    const prompt = `You are Sam, a friendly insurance advisor. Present the analysis in a SHORT, conversational way.

**Rules**:
- Keep it to 2-3 sentences max
- Get to the key point immediately
- Use plain text - NO markdown, NO asterisks, NO bold formatting
- Use simple language
- End with a quick question or next step
- Don't say "Uri said" or "Rai said" - speak as one voice

Be warm but BRIEF.

User asked: "${originalQuery}"

Analysis result:
${finalAnswer}

Present this to the user in a friendly, clear way:`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
        },
    });

    const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text || finalAnswer;
    return cleanResponse(response);
}
