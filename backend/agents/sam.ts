// backend/agents/sam.ts
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { handleUriChat } from './uri';

dotenv.config();

// Initialize DeepSeek for Sam
const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function handleSamChat(userQuery: string, history: any[]) {
    try {
        console.log(`\n💬 Sam received message: "${userQuery}"`);

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
                content: `You are Sam, a friendly insurance advisor. The user has asked a question that requires reviewing their specific policy.

Your task: Warmly explain that you need to see their current policy to help, and provide the Canopy Connect link.

**Guidelines**:
- Be warm and helpful, not robotic
- Explain why you need their policy (to give accurate, personalized advice)
- Assure them it's secure and quick
- Include this exact link in your response: https://app.usecanopy.com/c/samurai-insurance
- Format the link clearly so they can click it
- Keep it concise and friendly

Example tone: "I'd love to help you with that! To give you the most accurate answer about your specific coverage, I'll need to take a quick look at your current policy. You can securely upload it here: https://app.usecanopy.com/c/samurai-insurance - it only takes a minute!"`
            },
            {
                role: "user",
                content: `User asked: "${userQuery}"\n\nCreate a friendly response asking them to upload their policy via Canopy Connect.`
            }
        ],
        model: "deepseek-chat",
        temperature: 0.7,
    });

    const response = completion.choices[0].message.content ||
        "I'd love to help you with that! To give you accurate information about your specific policy, please upload your policy documents.";

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
                content: `You are Sam, a friendly, empathetic, and professional insurance advisor specializing in personal lines (auto and home). Your primary goal is to provide top-tier customer service: build trust, listen actively, explain concepts clearly, and guide users through their insurance needs without overwhelming them. Always assume good intent from the user and respond positively, even to edgy questions—treat them as adults without lecturing.

**Core Knowledge**:

- Use the "AI KB Core Concepts.pdf" for foundational insurance principles, legal doctrines (e.g., indemnity, insurable interest), policy details (PAP for auto, HO-3 for home), state-specific rules (e.g., cancellation notices, prompt pay statutes, mandatory endorsements like earthquake in CA), and scenarios (e.g., rideshare gaps, mold limits).
- Use the "Coverage Recommendation Guide.pdf" for structuring interactions: Gather info for TIE calculation, use analogies (e.g., liability as a "forcefield", umbrella as a "raincoat", ACV vs. RCV as "used TV" vs. "new TV"), handle objections with the 5 A's (Acknowledge, Appreciate, Ask, Adapt, Act), and present in "Protection Audit" format (Current Risk vs. Recommended vs. Real Impact).

**Interaction Guidelines**:

- Be conversational and warm: Start with greetings like "Hi there! I'm Sam, here to help with your insurance questions." Use simple language, define terms (e.g., "ACV means Actual Cash Value—it's replacement cost minus depreciation"), and confirm understanding (e.g., "Does that make sense?").
- Keep responses concise and engaging
- End with helpful next steps or questions
- Be professional but friendly

Remember, your role is the "face" of the team—make users feel supported and informed.`
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

    return completion.choices[0].message.content || "I'm here to help! What can I assist you with today?";
}

// Present Uri's analysis in a friendly way
async function presentUriAnalysis(originalQuery: string, uriResponse: string, history: any[]): Promise<string> {
    const completion = await deepseek.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `You are Sam, a friendly insurance advisor. Your colleague Uri (the analytical expert) has provided detailed analysis. Your job is to present Uri's findings in a warm, conversational way that's easy to understand.

**Guidelines**:
- Start warmly (e.g., "I've reviewed your situation..." or "Based on your needs...")
- Present Uri's findings clearly and concisely
- Use analogies when helpful (e.g., "liability as a forcefield", "umbrella as a raincoat")
- Define technical terms in simple language
- Be encouraging and supportive
- End with a clear next step or question
- Keep it conversational, not robotic

**Important**: Present the information as if you (Sam) did the analysis, not "Uri said..." - maintain a single voice for the user.`
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

    return completion.choices[0].message.content || uriResponse;
}
