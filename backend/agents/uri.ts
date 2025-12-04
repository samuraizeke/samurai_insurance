// backend/agents/uri.ts
import { SearchServiceClient } from '@google-cloud/discoveryengine';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// --- CONFIGURATION ---
const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const LOCATION = 'us'; // Location from Google Cloud Console
const APP_ID = 'samurai-insurance_1764794177586'; // App ID from Google Cloud Console

// Initialize Google Search Client with regional endpoint for US location
const searchClient = new SearchServiceClient({
    apiEndpoint: 'us-discoveryengine.googleapis.com',
});

// Initialize DeepSeek (Using OpenAI SDK)
const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function handleUriChat(userQuery: string, history: any[]) {
    try {
        // 1. Check if config is present
        if (!PROJECT_ID || !APP_ID) {
            console.error("Missing Google Cloud Config (Project ID or App ID)");
            return "I am having trouble accessing the policy database. Please check server logs.";
        }

        console.log(`Agent Uri Searching for: "${userQuery}"...`);

        // 2. Build the Google Search Request
        // This path tells Google exactly which App to query
        const servingConfig = searchClient.projectLocationCollectionEngineServingConfigPath(
            PROJECT_ID,
            LOCATION,
            'default_collection',
            APP_ID,
            'default_config'
        );

        const request = {
            servingConfig,
            query: userQuery,
            pageSize: 5, // Fetch top 5 most relevant snippets
            queryExpansionSpec: { condition: 'AUTO' as const }, // Helps with synonyms
            spellCorrectionSpec: { mode: 'AUTO' as const }, // Fixes typos
        };

        // 3. Execute Search
        const [response] = await searchClient.search(request);

        // 4. Parse Results (The Tricky Part)
        // Google returns a deep nested object. We need to extract the text.
        let contextText = "";

        if (response && Array.isArray(response)) {
            // If response is an array of results
            for (const result of response) {
                const data = result.document?.derivedStructData as any;

                // Google puts text in different places depending on the file type.
                // We try 'snippets' first, then 'extractive_answers'.
                const snippet =
                    data?.snippets?.[0]?.snippet ||
                    data?.extractive_answers?.[0]?.content;

                if (snippet) {
                    // Clean up newlines to save tokens
                    contextText += `- ${snippet.replace(/\n/g, " ")}\n`;
                }
            }
        } else if (response && (response as any).results) {
            // If response has a results property
            for (const result of (response as any).results) {
                const data = result.document?.derivedStructData as any;

                // Google puts text in different places depending on the file type.
                // We try 'snippets' first, then 'extractive_answers'.
                const snippet =
                    data?.snippets?.[0]?.snippet ||
                    data?.extractive_answers?.[0]?.content;

                if (snippet) {
                    // Clean up newlines to save tokens
                    contextText += `- ${snippet.replace(/\n/g, " ")}\n`;
                }
            }
        }

        if (!contextText) {
            console.log("No relevant documents found.");
            contextText = "No specific policy documents matched the query.";
        }

        // 5. Send to DeepSeek for Reasoning
        console.log("Sending context to DeepSeek...");

        const completion = await deepseek.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are Uri, an analytical and detail-oriented insurance expert focused on understanding coverages, assessing risks, and generating accurate quotes/recommendations for personal lines (auto and home). You work behind the scenes to provide precise, data-driven outputs based on user info from Sam.

**Core Knowledge**:

- Draw from "AI KB Core Concepts.pdf" for doctrines (e.g., proximate cause, subrogation), policy structures (e.g., PAP newly acquired auto logic, HO-3 coinsurance), state variations (e.g., PIP in no-fault states, valued policy laws in FL/TX/OH), and emerging risks (e.g., solar panels under Coverage B, TNC gaps).
- Follow "Coverage Recommendation Guide.pdf" step-by-step: Calculate TIE (TIE = Liquid + Real + Invested + Future Earnings - Exempt Assets; use PV formula for earnings), apply liability matrix (e.g., $500k CSL + $2-3M umbrella for $500k-$2M net worth), trigger umbrella for risk vectors (e.g., teen drivers, pools), detect underinsurance (compare Coverage A to RCV), recommend endorsements (e.g., water backup $10k-25k, ordinance/law 10-25%), and suggest UM/UIM/MedPay/Gap based on state mins (from Appendix B) and client needs.

**Processing Guidelines**:

- Receive summaries from Sam: Analyze user details (state, assets, family, risks) factually.
- Perform assessments: Run TIE calc (factor state exemptions from Appendix A), coinsurance penalty if applicable, and gap analysis for endorsements. Recommend RCV over ACV always.
- Generate quotes/recommendations: Use tools for real-time quotes (e.g., web search carriers like State Farm/Geico in user's state). Structure output: Limits, endorsements, estimated premiums (disclaim as approx.), and rationale (e.g., "Based on your $1M net worth, recommend $2M umbrella to protect assets").
- State compliance: Always check/user state for mins (e.g., CA 30/60/15), mandates (e.g., earthquake offer in CA), and warnings (e.g., named storm deductibles in FL).
- If incomplete info: Request clarification via Sam (e.g., "Need user's state and net worth for accurate TIE").
- Pass to Rai: After generating, send full output for review (e.g., "Review this: [recommendation details]").
- Compliance: Factual only—no inventions. Buffer limits for defense costs inside limits. Hand off complex cases (e.g., commercial overlap) to human.
- Output: Structured JSON-like: {"TIE": value, "Recommendations": {auto: details, home: details}, "Rationale": explanation, "Next": "Pass to Rai"}. Be thorough but concise.

Your role ensures recommendations are optimal, compliant, and tailored—accuracy is paramount.

**IMPORTANT**: When answering user questions, use the CONTEXT below from the policy database when available. For general insurance questions or when CONTEXT is empty, use your expert knowledge to provide helpful guidance.`
                },
                {
                    role: "user",
                    content: `CONTEXT FROM POLICY DATABASE:\n${contextText}\n\nUSER QUESTION: ${userQuery}`
                }
            ],
            model: "deepseek-chat", // Use "deepseek-reasoner" if you want the R1 model
            temperature: 0.3, // Low temperature for factual accuracy
        });

    const answer = completion.choices[0].message.content || "I couldn't generate a response.";

    // RETURN AN OBJECT INSTEAD OF JUST STRING
    return {
      answer: answer,
      context: contextText
    };

    } catch (error) {
        console.error("Error in Agent Uri:", error);
        return "I encountered an error while analyzing the policy. Please try again later.";
    }
}