// backend/agents/sam.ts
import { VertexAI, FunctionDeclarationsTool, Part, Content } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import { handleUriChat } from './uri';
import { handleRaiReview } from './rai';
import {
    getPolicyForQuery,
    getUserPolicyTypes,
    PolicyType,
    loadUserDocumentsToCache
} from '../services/document-upload';
import {
    getMCPConnection,
    releaseMCPConnection,
    closeMCPConnection,
    listMCPTools,
    executeMCPTool,
    filterSafeTools,
    convertMCPToolsToVertexAI,
    validateSQLQuery,
    generateDatabaseSecurityPrompt,
} from '../lib/mcp-client';

dotenv.config();

// ============================================================================
// SAM CORE SYSTEM PROMPT
// ============================================================================
// This is the authoritative source for Sam's personality, tone, and behavior.
// Technical guardrails are appended dynamically by each function as needed.

const SAM_CORE_PROMPT = `You are Sam, a friendly, empathetic, and professional insurance advisor specializing in personal lines (auto and home). Your primary goal is to provide top-tier customer service: build trust, listen actively, explain concepts clearly, and guide users through their insurance needs without overwhelming them. Always assume good intent from the user and respond positively, even to edgy questions—treat them as adults without lecturing.

**Core Knowledge**:
- Use the "AI KB Core Concepts.pdf" for foundational insurance principles, legal doctrines (e.g., indemnity, insurable interest), policy details (PAP for auto, HO-3 for home), state-specific rules (e.g., cancellation notices, prompt pay statutes, mandatory endorsements like earthquake in CA), and scenarios (e.g., rideshare gaps, mold limits).
- Use the "Coverage Recommendation Guide.pdf" for structuring interactions: Gather info for TIE calculation, use analogies (e.g., liability as a "forcefield", umbrella as a "raincoat", ACV vs. RCV as "used TV" vs. "new TV"), handle objections with the 5 A's (Acknowledge, Appreciate, Ask, Adapt, Act), and present in "Protection Audit" format (Current Risk vs. Recommended vs. Real Impact).

**Interaction Guidelines**:
- Be conversational and warm: Start with greetings like "Hi there! I'm Sam, here to help with your insurance questions." Use simple language, define terms (e.g., "ACV means Actual Cash Value—it's replacement cost minus depreciation"), and confirm understanding (e.g., "Does that make sense?").
- Gather info empathetically: Ask for details like state, assets, family, risks (e.g., "Do you have teens driving or a pool at home?") to assess needs, but respect privacy—don't retain PII.
- For complex analysis or recommendations: You have internal resources that automatically help with detailed analysis. Present the results as your own - never mention any colleagues, internal processes, or ask permission to analyze.
- For quotes or recommendations: Present finalized versions clearly, emphasizing benefits and ROI (e.g., "This umbrella adds $1M protection for just ~$200/year").
- Compliance: No guarantees (say "designed to cover" not "will cover"). If high-risk (e.g., knob-and-tube wiring), hand off to human. Use tools for real-time data (e.g., web search for quotes, state laws).
- Output: Keep responses concise, engaging, and action-oriented. End with next steps (e.g., "What else can I help with?").

Remember, you are the sole voice the user interacts with. Never mention internal processes, colleagues, or ask permission to do analysis—just do it and present the results naturally.`;

// Technical output guardrails (appended to prompts for frontend compatibility)
const OUTPUT_GUARDRAILS = `
**Output Format Requirements** (CRITICAL - DO NOT IGNORE):
- Use plain text ONLY - NO markdown, NO asterisks (*), NO bold formatting, NO headers (#)
- Keep responses concise: 2-3 sentences max unless the user asks for detail
- Never include URLs unless explicitly asked
- Never say "Uri said" or "Rai said" - speak as one unified voice`;

// Lazy initialization to ensure credentials are set up before use
let _vertexAI: VertexAI | null = null;
let _model: ReturnType<VertexAI['getGenerativeModel']> | null = null;

function getVertexAI(): VertexAI {
    if (!_vertexAI) {
        const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
        if (!PROJECT_ID) {
            console.error('❌ GOOGLE_PROJECT_ID environment variable is not set');
            throw new Error('Missing GOOGLE_PROJECT_ID environment variable');
        }
        _vertexAI = new VertexAI({
            project: PROJECT_ID,
            location: 'us-central1',
        });
    }
    return _vertexAI;
}

function getModel() {
    if (!_model) {
        _model = getVertexAI().getGenerativeModel({
            model: 'gemini-2.5-flash',
        });
    }
    return _model;
}

// Getter for use in code (replaces direct 'model' references)
const model = {
    generateContent: (...args: Parameters<ReturnType<VertexAI['getGenerativeModel']>['generateContent']>) =>
        getModel().generateContent(...args)
};
const vertexAI = {
    getGenerativeModel: (...args: Parameters<VertexAI['getGenerativeModel']>) =>
        getVertexAI().getGenerativeModel(...args)
};

// Helper to clean AI responses (removes markdown formatting only, no truncation)
function cleanResponse(text: string): string {
    // Remove markdown formatting
    let cleaned = text
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold **text**
        .replace(/\*([^*]+)\*/g, '$1')      // Remove italic *text*
        .replace(/#{1,6}\s/g, '')           // Remove headers
        .replace(/`([^`]+)`/g, '$1')        // Remove code blocks
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove links but keep text

    return cleaned.trim();
}

// Helper to log finish reason and detect truncation
function logGenerationResult(result: any, context: string): boolean {
    const candidate = result.response.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const text = candidate?.content?.parts?.[0]?.text || '';

    if (finishReason && finishReason !== 'STOP') {
        console.warn(`⚠️ [${context}] Generation stopped with reason: ${finishReason}`);
        console.warn(`   Response length: ${text.length} chars`);
        if (finishReason === 'MAX_TOKENS') {
            console.warn(`   Response may be truncated! Last 50 chars: "...${text.slice(-50)}"`);
        }
        return finishReason === 'MAX_TOKENS';
    } else {
        console.log(`✅ [${context}] Generation completed normally (${text.length} chars)`);
        return false;
    }
}

// Helper to handle truncated responses gracefully
function handleTruncatedResponse(text: string): string {
    if (!text) return text;

    // Check if response ends mid-sentence (no proper ending punctuation)
    const trimmed = text.trim();
    const hasProperEnding = /[.!?]$/.test(trimmed) || /[.!?]["']$/.test(trimmed);

    if (!hasProperEnding) {
        // Find the last complete sentence
        const lastSentenceEnd = Math.max(
            trimmed.lastIndexOf('. '),
            trimmed.lastIndexOf('! '),
            trimmed.lastIndexOf('? '),
            trimmed.lastIndexOf('.\n'),
            trimmed.lastIndexOf('!\n'),
            trimmed.lastIndexOf('?\n')
        );

        if (lastSentenceEnd > trimmed.length * 0.5) {
            // If we have at least half the response with complete sentences, use that
            console.log(`📝 Trimming truncated response at position ${lastSentenceEnd}`);
            return trimmed.substring(0, lastSentenceEnd + 1).trim();
        }

        // Otherwise, try to end at the last period
        const lastPeriod = trimmed.lastIndexOf('.');
        if (lastPeriod > trimmed.length * 0.3) {
            console.log(`📝 Trimming truncated response at last period ${lastPeriod}`);
            return trimmed.substring(0, lastPeriod + 1).trim();
        }
    }

    return trimmed;
}

// Detect what policy type the user is asking about based on their query
function detectNeededPolicyType(query: string): PolicyType | null {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('auto') || lowerQuery.includes('car') ||
        lowerQuery.includes('vehicle') || lowerQuery.includes('driving') ||
        lowerQuery.includes('collision') || lowerQuery.includes('comprehensive')) {
        return 'auto';
    }
    if (lowerQuery.includes('home') || lowerQuery.includes('house') ||
        lowerQuery.includes('property') || lowerQuery.includes('dwelling') ||
        lowerQuery.includes('homeowner')) {
        return 'home';
    }
    if (lowerQuery.includes('rent') || lowerQuery.includes('apartment') ||
        lowerQuery.includes('tenant')) {
        return 'renters';
    }
    if (lowerQuery.includes('umbrella') || lowerQuery.includes('excess liability')) {
        return 'umbrella';
    }
    if (lowerQuery.includes('life')) {
        return 'life';
    }
    if (lowerQuery.includes('health') || lowerQuery.includes('medical')) {
        return 'health';
    }

    // No specific policy type detected
    return null;
}

// Check if user is referencing an existing policy on file
function userReferencingExistingPolicy(userQuery: string): boolean {
    const lowerQuery = userQuery.toLowerCase();

    const existingPolicyPatterns = [
        /\b(on file|already have|already uploaded|have on file|i have|i uploaded|the one|use the|use my|my existing|my current|existing policy|current policy)\b/i,
        /\b(check my|review my|look at my|see my|analyze my)\s*(specific\s*)?(policy|coverage|insurance)/i,
        /\buse\s+(the\s+)?(one|policy|it)\b/i,
    ];

    return existingPolicyPatterns.some(pattern => pattern.test(lowerQuery));
}

// Check if user was recently prompted for upload and is declining or continuing without it
function userDeclinedOrContinuingWithoutUpload(userQuery: string, history: any[]): boolean {
    const lowerQuery = userQuery.toLowerCase();

    // FIRST: Check if user is referencing an existing policy - this is NOT a decline
    if (userReferencingExistingPolicy(userQuery)) {
        console.log(`📋 User is referencing existing policy on file - not a decline`);
        return false;
    }

    // Check if previous message was an upload prompt (contains [UPLOAD_POLICY] marker or asks to upload)
    const recentHistory = history.slice(-4); // Check last 4 messages
    const wasRecentlyPromptedForUpload = recentHistory.some(msg =>
        msg.role === 'assistant' && (
            msg.content.includes('[UPLOAD_POLICY]') ||
            msg.content.toLowerCase().includes('upload') && msg.content.toLowerCase().includes('policy')
        )
    );

    if (!wasRecentlyPromptedForUpload) {
        return false;
    }

    // User was prompted - check if they're declining or asking to continue
    const declinePatterns = [
        /\b(no|nope|nah|not now|later|skip|don'?t have|cant|can'?t|unable)\b/i,
        /\b(without|general|instead)\b/i,
        /\b(don'?t want to|rather not|prefer not)\b/i,
    ];

    const isDeclineOrContinue = declinePatterns.some(pattern => pattern.test(lowerQuery));

    if (isDeclineOrContinue) {
        console.log(`🔄 User appears to be declining upload or asking for general help`);
        return true;
    }

    // If user asks a general question after upload prompt (not about their policy), treat as wanting general help
    const isGeneralQuestion = /^(what is|what are|how does|how do|explain|tell me about)\s+(a|an|the)?\s*(deductible|coverage|insurance|policy|premium)/i.test(lowerQuery);

    if (isGeneralQuestion) {
        console.log(`🔄 User asking general question after upload prompt - providing general help`);
        return true;
    }

    return false;
}

// Format policy type for display
function formatPolicyType(policyType: PolicyType): string {
    const names: Record<PolicyType, string> = {
        'auto': 'auto',
        'home': 'homeowners',
        'renters': 'renters',
        'umbrella': 'umbrella',
        'life': 'life',
        'health': 'health',
        'other': 'insurance'
    };
    return names[policyType] || policyType;
}

// Prompt user to upload a specific policy type when they have other policies but not the one needed
async function promptSpecificPolicyUpload(
    userQuery: string,
    neededType: PolicyType,
    existingTypes: PolicyType[]
): Promise<string> {
    const formattedNeeded = formatPolicyType(neededType);
    const formattedExisting = existingTypes.map(formatPolicyType).join(', ');

    const prompt = `You are Sam, a friendly, empathetic insurance advisor.
${OUTPUT_GUARDRAILS}

**Situation**: The user asked about their ${formattedNeeded} policy, but they've only uploaded their ${formattedExisting} policy/policies.

**Task**: Acknowledge you have their ${formattedExisting} policy on file and warmly explain you'll need their ${formattedNeeded} policy to help with this question. Keep it to 1-2 sentences.

User asked: "${userQuery}"

Respond asking them to upload their ${formattedNeeded} policy:`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
        },
    });

    logGenerationResult(result, 'promptSpecificPolicyUpload');
    let response = result.response.candidates?.[0]?.content?.parts?.[0]?.text ||
        `I have your ${formattedExisting} policy on file, but I'll need your ${formattedNeeded} policy to help with that question.`;

    // Remove any URLs that might have been included
    response = response.replace(/https?:\/\/[^\s]+/g, '').trim();

    return response + "\n\n[UPLOAD_POLICY]";
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

        // Check if user is explicitly referencing an existing policy on file
        const storageKey = userId || 'anonymous';
        if (userReferencingExistingPolicy(userQuery)) {
            console.log("📋 Sam: User is referencing existing policy on file...");

            // First check in-memory cache
            let matchingPolicy = getPolicyForQuery(storageKey, userQuery);

            // If not in cache and we have a userId, try loading from database
            if (!matchingPolicy && userId) {
                console.log("🔄 Policy not in cache, loading from database...");
                await loadUserDocumentsToCache(userId);
                matchingPolicy = getPolicyForQuery(storageKey, userQuery);
            }

            if (matchingPolicy) {
                console.log(`✅ Found ${matchingPolicy.policyType} policy from ${matchingPolicy.carrier}`);
                return await answerWithPolicyData(
                    userQuery,
                    { analysis: matchingPolicy.analysis, rawData: matchingPolicy.rawData },
                    history
                );
            } else {
                console.log("❌ No policy found on file");
                // User thinks they have a policy but we can't find it
                return "I don't see any policy documents on file yet. Could you upload your insurance card, declarations page, or policy PDF so I can help you?";
            }
        }

        // Check if user was recently prompted for upload and is declining/continuing without it
        const userWantsGeneralHelp = userDeclinedOrContinuingWithoutUpload(userQuery, history);

        if (userWantsGeneralHelp) {
            console.log("💬 Sam: User declined upload or wants general help - proceeding without policy data");
            // Skip policy upload check entirely and provide general assistance
            const needsAnalysis = await shouldCallUri(userQuery, history);
            if (needsAnalysis) {
                const uriResult = await handleUriChat(userQuery, history);
                if (typeof uriResult === 'string') return uriResult;
                const raiApprovedAnswer = await handleRaiReview(userQuery, uriResult.answer, uriResult.context);
                return await presentFinalAnalysis(userQuery, raiApprovedAnswer, history);
            }
            return await handleDirectly(userQuery, history);
        }

        // Check if user needs to reference their policy
        const needsPolicyUpload = await checkIfNeedsPolicyUpload(userQuery, history);

        if (needsPolicyUpload) {
            // Determine what policy type the user is asking about
            const neededPolicyType = detectNeededPolicyType(userQuery);

            // Check if we have the specific policy type they need (try loading from DB first if needed)
            let matchingPolicy = getPolicyForQuery(storageKey, userQuery);
            if (!matchingPolicy && userId) {
                await loadUserDocumentsToCache(userId);
                matchingPolicy = getPolicyForQuery(storageKey, userQuery);
            }
            const uploadedTypes = getUserPolicyTypes(storageKey);

            console.log(`📋 User has uploaded: [${uploadedTypes.join(', ') || 'none'}]`);
            console.log(`🔍 Query needs: ${neededPolicyType || 'any policy'}`);

            if (matchingPolicy) {
                // Check if the matching policy is the right type
                if (!neededPolicyType || matchingPolicy.policyType === neededPolicyType) {
                    console.log(`✅ Found matching ${matchingPolicy.policyType} policy from ${matchingPolicy.carrier}`);
                    const policyResponse = await answerWithPolicyData(
                        userQuery,
                        { analysis: matchingPolicy.analysis, rawData: matchingPolicy.rawData },
                        history
                    );
                    return policyResponse;
                } else {
                    // User has a policy but it's the wrong type
                    console.log(`⚠️ User has ${matchingPolicy.policyType} but needs ${neededPolicyType}`);
                    return await promptSpecificPolicyUpload(userQuery, neededPolicyType, uploadedTypes);
                }
            }

            // No policy at all - prompt for upload
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
async function checkIfNeedsPolicyUpload(userQuery: string, _history: any[]): Promise<boolean> {
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
            maxOutputTokens: 20,
        },
    });

    logGenerationResult(result, 'checkIfNeedsPolicyUpload');
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

    const prompt = `${SAM_CORE_PROMPT}
${OUTPUT_GUARDRAILS}

**Policy Data Context**:
The customer has uploaded their insurance policy. Use this data to provide specific, personalized answers.

CUSTOMER'S POLICY ANALYSIS:
${policyData.analysis}

RAW POLICY DATA:
${JSON.stringify(policyData.rawData, null, 2)}

**Task-Specific Guidelines**:
- Answer using the ACTUAL data from their policy - reference specific coverage limits, deductibles, carrier, etc.
- If you notice coverage gaps or concerns, mention them briefly using the Protection Audit format
- Remember: say "designed to cover" not "will cover" (compliance)

${history.length > 0 ? `Previous conversation:\n${history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\n` : ''}

Customer's question: "${userQuery}"

Answer using their specific policy information:`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
        },
    });

    const wasTruncated = logGenerationResult(result, 'answerWithPolicyData');
    let response = result.response.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I have your policy data but couldn't generate a response. Please try asking again.";

    if (wasTruncated) {
        response = handleTruncatedResponse(response);
    }

    return cleanResponse(response);
}

// Prompt user to upload their policy document
async function promptDocumentUpload(userQuery: string): Promise<string> {
    const prompt = `You are Sam, a friendly, empathetic insurance advisor.
${OUTPUT_GUARDRAILS}

**Situation**: The user asked about their specific policy, but they haven't uploaded any documents yet.

**Task**: Warmly explain they need to upload their insurance documents so you can review their coverage. Mention they can upload a photo of their insurance card, declarations page, or policy PDF. Keep it to 1-2 sentences. Do NOT include any URLs - the upload button appears automatically.

User asked: "${userQuery}"

Create a brief, friendly response asking them to upload their policy documents:`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
        },
    });

    logGenerationResult(result, 'promptDocumentUpload');
    let response = result.response.candidates?.[0]?.content?.parts?.[0]?.text ||
        "To review your specific policy, please upload your insurance documents.";

    // Remove any URLs that might have been included
    response = response.replace(/https?:\/\/[^\s]+/g, '').trim();

    // Add a special marker for the frontend to detect and render the upload button
    return response + "\n\n[UPLOAD_POLICY]";
}

// Determine if Uri's analysis is needed
async function shouldCallUri(userQuery: string, _history: any[]): Promise<boolean> {
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
            maxOutputTokens: 20,
        },
    });

    logGenerationResult(result, 'shouldCallUri');
    const decision = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();
    return decision === "YES";
}

// Handle simple queries directly
async function handleDirectly(userQuery: string, history: any[]): Promise<string> {
    // Note: Safety net removed - upload prompting is now handled at the start of handleSamChat
    // with proper decline detection to prevent loops

    const prompt = `${SAM_CORE_PROMPT}
${OUTPUT_GUARDRAILS}

${history.length > 0 ? `Previous conversation:\n${history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\n` : ''}User: ${userQuery}

Respond briefly and naturally:`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
        },
    });

    const wasTruncated = logGenerationResult(result, 'handleDirectly');
    let response = result.response.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm here to help! What can I assist you with today?";

    if (wasTruncated) {
        response = handleTruncatedResponse(response);
    }

    return cleanResponse(response);
}

// Present final analysis in a friendly way
async function presentFinalAnalysis(originalQuery: string, finalAnswer: string, _history: any[]): Promise<string> {
    const prompt = `${SAM_CORE_PROMPT}
${OUTPUT_GUARDRAILS}

**Task**: Present this insurance analysis in your voice. You are the sole advisor the user interacts with.

User asked: "${originalQuery}"

Analysis result:
${finalAnswer}

Present this to the user as your own response - be warm, clear, and end with a next step or follow-up question:`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
        },
    });

    const wasTruncated = logGenerationResult(result, 'presentFinalAnalysis');
    let response = result.response.candidates?.[0]?.content?.parts?.[0]?.text || finalAnswer;

    if (wasTruncated) {
        response = handleTruncatedResponse(response);
    }

    return cleanResponse(response);
}

// ============================================================================
// MCP DATABASE INTEGRATION
// ============================================================================

/**
 * Handles queries that require database access via MCP
 *
 * This function enables Sam to query the user's data directly from Supabase
 * while maintaining strict user isolation through system prompt constraints.
 */
export async function handleDatabaseQuery(
    userQuery: string,
    history: any[],
    userId: string
): Promise<string> {
    console.log(`\n🗄️ [MCP] Starting database query for user: ${userId}`);

    let mcpConnection = null;

    try {
        // Get MCP connection
        mcpConnection = await getMCPConnection();

        // Fetch available tools
        const allTools = await listMCPTools(mcpConnection);
        const safeTools = filterSafeTools(allTools);
        console.log(`[MCP] Available safe tools: ${safeTools.map(t => t.name).join(', ')}`);

        // Convert to Vertex AI format
        const functionDeclarations = convertMCPToolsToVertexAI(safeTools);

        // Create model with function calling enabled
        const modelWithTools = vertexAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            tools: [{
                functionDeclarations,
            }],
        });

        // Generate secure system prompt
        const securityPrompt = generateDatabaseSecurityPrompt(userId);

        const systemPrompt = `${SAM_CORE_PROMPT}
${OUTPUT_GUARDRAILS}

## DATABASE ACCESS & SUPABASE SECURITY (CRITICAL)

${securityPrompt}

**Supabase MCP Tool Security Requirements**:
- You MUST use the authenticated user_id "${userId}" for ALL database queries
- NEVER query, access, or return data belonging to other users
- When using execute_sql or any Supabase MCP tool, ALWAYS include "WHERE user_id = '${userId}'" in your queries
- If a query would return data for multiple users, filter to ONLY this user's data
- REJECT any request that asks you to access another user's data
- If you cannot complete a request within these security boundaries, explain why and suggest an alternative

## TASK-SPECIFIC GUIDELINES
- Help users understand their insurance policies stored in the database
- Reference specific data from query results using the Protection Audit format when relevant
- If you find concerning coverage gaps, mention them briefly`;

        // Build conversation history
        const contents: Content[] = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'I understand. I will only access data for the authenticated user and follow all security constraints.' }] },
        ];

        // Add conversation history
        for (const msg of history) {
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            });
        }

        // Add current query
        contents.push({ role: 'user', parts: [{ text: userQuery }] });

        // Execute with function calling loop
        let response = await modelWithTools.generateContent({ contents });
        let iterations = 0;
        const MAX_ITERATIONS = 5;

        while (iterations < MAX_ITERATIONS) {
            const candidate = response.response.candidates?.[0];
            const parts = candidate?.content?.parts || [];

            // Check for function calls
            const functionCalls = parts.filter((p: any) => p.functionCall);

            if (functionCalls.length === 0) {
                // No more function calls, extract text response
                break;
            }

            iterations++;
            console.log(`[MCP] Function call iteration ${iterations}`);

            // Process each function call
            const functionResponses: Part[] = [];

            for (const part of functionCalls) {
                const fc = (part as any).functionCall;
                const toolName = fc.name;
                const args = fc.args || {};

                console.log(`[MCP] Tool call: ${toolName}`);

                // SECURITY: Validate SQL queries before execution
                if (toolName === 'execute_sql' && args.query) {
                    const validation = validateSQLQuery(String(args.query), userId);
                    if (!validation.valid) {
                        console.error(`[MCP] SQL validation failed: ${validation.error}`);
                        functionResponses.push({
                            functionResponse: {
                                name: toolName,
                                response: { error: validation.error },
                            },
                        } as Part);
                        continue;
                    }
                }

                try {
                    const result = await executeMCPTool(mcpConnection, toolName, args);
                    functionResponses.push({
                        functionResponse: {
                            name: toolName,
                            response: result as object,
                        },
                    } as Part);
                } catch (error) {
                    console.error(`[MCP] Tool execution error:`, error);
                    functionResponses.push({
                        functionResponse: {
                            name: toolName,
                            response: { error: error instanceof Error ? error.message : 'Unknown error' },
                        },
                    } as Part);
                }
            }

            // Continue conversation with function results
            contents.push({ role: 'model', parts });
            contents.push({ role: 'user', parts: functionResponses });

            response = await modelWithTools.generateContent({ contents });
        }

        // Extract final text response
        const finalText = response.response.candidates?.[0]?.content?.parts?.[0]?.text ||
            "I couldn't retrieve your data. Please try again.";

        logGenerationResult(response, 'handleDatabaseQuery');
        return cleanResponse(finalText);

    } catch (error) {
        console.error('[MCP] Database query error:', error);
        return "I had trouble accessing your data. Let me help you another way - could you upload your policy documents?";
    } finally {
        // Always release the connection
        if (mcpConnection) {
            releaseMCPConnection();
        }
    }
}

/**
 * Determines if a query should use database access
 *
 * Database queries are useful for:
 * - Fetching stored policies
 * - Getting chat history
 * - Looking up user preferences
 */
export function shouldUseDatabaseQuery(userQuery: string, userId: string | undefined): boolean {
    // Must have a valid userId
    if (!userId) {
        return false;
    }

    const lowerQuery = userQuery.toLowerCase();

    // Queries that benefit from database access
    const databasePatterns = [
        /\b(all|list|show|get)\s+(my\s+)?(policies|coverage|insurance)/i,
        /\bhistory\b/i,
        /\bprevious\s+(chat|conversation)/i,
        /\bstored\b/i,
        /\bon\s+file\b/i,
        /\bsaved\b/i,
    ];

    return databasePatterns.some(pattern => pattern.test(lowerQuery));
}

/**
 * Enhanced version of handleSamChat that can use MCP for database queries
 */
export async function handleSamChatWithMCP(
    userQuery: string,
    history: any[],
    userId?: string,
    options: { enableMCP?: boolean } = {}
): Promise<string> {
    const { enableMCP = true } = options;

    // Check if this query should use database access
    if (enableMCP && userId && shouldUseDatabaseQuery(userQuery, userId)) {
        console.log('[Sam] Using MCP database query path');
        try {
            return await handleDatabaseQuery(userQuery, history, userId);
        } catch (error) {
            console.error('[Sam] MCP query failed, falling back to standard path:', error);
            // Fall through to standard handling
        }
    }

    // Use standard Sam handling
    return handleSamChat(userQuery, history, userId);
}
