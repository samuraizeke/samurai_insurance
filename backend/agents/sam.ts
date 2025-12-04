// backend/agents/sam.ts
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { handleUriChat } from './uri';

dotenv.config();

// Helper to clean AI responses
function cleanResponse(text: string): string {
    // Remove markdown formatting
    let cleaned = text
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold **text**
        .replace(/\*([^*]+)\*/g, '$1')      // Remove italic *text*
        .replace(/#{1,6}\s/g, '')           // Remove headers
        .replace(/`([^`]+)`/g, '$1')        // Remove code blocks
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove links but keep text

    // Limit to ~3 sentences (split on . ! ?)
    const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 3) {
        cleaned = sentences.slice(0, 3).join('. ') + '.';
    }

    return cleaned.trim();
}

// Initialize DeepSeek for Sam
const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function handleSamChat(userQuery: string, history: any[]) {
    try {
        console.log(`\n💬 Sam received message: "${userQuery}"`);

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

        // Check if user needs to upload their policy
        const needsPolicyUpload = await checkIfNeedsPolicyUpload(userQuery, history);

        if (needsPolicyUpload) {
            console.log("📄 Sam: User needs to upload their policy via Canopy...");
            const canopyResponse = await promptCanopyUpload(userQuery);
            return canopyResponse;
        }

        // First, let Sam decide if this needs Uri's analysis
        const needsAnalysis = await shouldCallUri(userQuery, history);

        if (needsAnalysis) {
            console.log("🔄 Sam: This query needs Uri's analysis...");

            // Call Uri for detailed analysis
            const uriResult = await handleUriChat(userQuery, history);

            // Uri returns either a string (error) or an object {answer, context}
            let uriResponse: string;
            if (typeof uriResult === 'string') {
                uriResponse = uriResult;
            } else {
                uriResponse = uriResult.answer;
            }

            // Sam now presents Uri's analysis in a friendly way
            console.log("✅ Sam: Presenting Uri's analysis to user...");
            const finalResponse = await presentUriAnalysis(userQuery, uriResponse, history);
            return finalResponse;
        } else {
            // Simple query - Sam can handle it directly
            console.log("💬 Sam: Handling this directly...");
            const directResponse = await handleDirectly(userQuery, history);
            return directResponse;
        }

    } catch (error) {
        console.error("Error in Agent Sam:", error);
        return "I apologize, but I encountered an error. Please try again or let me know if you need help with something else!";
    }
}

// Check if user needs to upload their policy via Canopy
async function checkIfNeedsPolicyUpload(userQuery: string, history: any[]): Promise<boolean> {
    const completion = await deepseek.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `You are a decision-making assistant. Determine if the user needs to upload their current insurance policy to get accurate help.

Questions that NEED policy upload (return "YES"):
- Specific questions about "my policy" or "my coverage"
- Requests for quotes or comparisons with current coverage
- Questions like "what does my policy cover", "what are my limits", "am I covered for X"
- Requests to review or analyze their specific policy
- Questions about filing a claim on their policy

Questions that DON'T need policy upload (return "NO"):
- General insurance education questions
- Questions about insurance concepts or how insurance works
- Hypothetical scenarios
- General recommendations without reference to a specific policy
- Greetings or small talk

Reply with ONLY "YES" or "NO".`
            },
            {
                role: "user",
                content: `User question: "${userQuery}"`
            }
        ],
        model: "deepseek-chat",
        temperature: 0.1,
    });

    const decision = completion.choices[0].message.content?.trim().toUpperCase();
    return decision === "YES";
}

// Prompt user to upload policy via Canopy Connect
async function promptCanopyUpload(userQuery: string): Promise<string> {
    const completion = await deepseek.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `You are Sam, a friendly insurance advisor. The user asked about their specific policy.

Your task: Briefly explain they need to connect their insurance carrier so you can review their policy.

**Guidelines**:
- Keep it SHORT (1-2 sentences)
- Explain they'll connect their carrier (not upload files)
- It's secure and takes seconds
- Use plain text - NO markdown, NO asterisks, NO bold formatting
- Do NOT include any URLs - the button appears automatically

Example: "To review your specific coverage, I'll need you to connect your insurance carrier. It's secure and only takes a few seconds!"`
            },
            {
                role: "user",
                content: `User asked: "${userQuery}"\n\nCreate a brief response asking them to connect their carrier.`
            }
        ],
        model: "deepseek-chat",
        temperature: 0.7,
    });

    let response = completion.choices[0].message.content ||
        "To review your specific policy, please connect your insurance carrier.";

    // Remove any URLs that might have been included
    response = response.replace(/https?:\/\/[^\s]+/g, '').trim();

    // Add a special marker for the frontend to detect and render the Canopy button
    return response + "\n\n[CANOPY_CONNECT]";
}

// Determine if Uri's analysis is needed
async function shouldCallUri(userQuery: string, history: any[]): Promise<boolean> {
    const completion = await deepseek.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `You are a decision-making assistant. Determine if the user's question needs detailed insurance analysis.

Questions that NEED analysis (return "YES"):
- Coverage recommendations or quotes
- Policy comparisons or calculations
- TIE (Total Insurable Estate) assessments
- Questions about specific coverages, limits, or endorsements
- Risk assessments or protection planning
- Questions requiring state-specific insurance knowledge

Questions that DON'T need analysis (return "NO"):
- Simple greetings (hi, hello, how are you)
- General insurance education questions (what is insurance, how does it work)
- Small talk or casual conversation
- Questions about you or your capabilities

Reply with ONLY "YES" or "NO".`
            },
            {
                role: "user",
                content: `User question: "${userQuery}"`
            }
        ],
        model: "deepseek-chat",
        temperature: 0.1,
    });

    const decision = completion.choices[0].message.content?.trim().toUpperCase();
    return decision === "YES";
}

// Handle simple queries directly
async function handleDirectly(userQuery: string, history: any[]): Promise<string> {
    const completion = await deepseek.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `You are Sam, a friendly insurance advisor. Keep responses SHORT and conversational—2-3 sentences max.

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

Be warm, concise, and helpful.`
            },
            ...history.map(msg => ({ role: msg.role, content: msg.content })),
            {
                role: "user",
                content: userQuery
            }
        ],
        model: "deepseek-chat",
        temperature: 0.7,
    });

    const response = completion.choices[0].message.content || "I'm here to help! What can I assist you with today?";
    return cleanResponse(response);
}

// Present Uri's analysis in a friendly way
async function presentUriAnalysis(originalQuery: string, uriResponse: string, history: any[]): Promise<string> {
    const completion = await deepseek.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `You are Sam, a friendly insurance advisor. Present Uri's analysis in a SHORT, conversational way.

**Rules**:
- Keep it to 2-3 sentences max
- Get to the key point immediately
- Use plain text - NO markdown, NO asterisks, NO bold formatting
- Use simple language
- End with a quick question or next step
- Don't say "Uri said" - speak as one voice

Be warm but BRIEF.`
            },
            {
                role: "user",
                content: `User asked: "${originalQuery}"

Uri's analysis:
${uriResponse}

Present this to the user in a friendly, clear way:`
            }
        ],
        model: "deepseek-chat",
        temperature: 0.7,
    });

    const response = completion.choices[0].message.content || uriResponse;
    return cleanResponse(response);
}
