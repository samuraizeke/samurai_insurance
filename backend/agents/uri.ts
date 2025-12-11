// backend/agents/uri.ts
import { SearchServiceClient } from '@google-cloud/discoveryengine';
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

dotenv.config();

// --- CONFIGURATION ---
const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const DATA_STORE_ID = process.env.GOOGLE_DATA_STORE_ID;

if (!PROJECT_ID) {
    console.error('❌ GOOGLE_PROJECT_ID environment variable is not set');
    throw new Error('Missing GOOGLE_PROJECT_ID environment variable');
}

// Initialize Google Search Client for GLOBAL location
const searchClient = new SearchServiceClient({
    apiEndpoint: 'discoveryengine.googleapis.com',
});

// Initialize Vertex AI for US-CENTRAL1 with Gemini 2.5 Flash
const vertexAI = new VertexAI({
    project: PROJECT_ID,
    location: 'us-central1',
});

const model = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
});

export async function handleUriChat(userQuery: string, history: any[]) {
    try {
        // 1. Check if config is present
        if (!PROJECT_ID || !DATA_STORE_ID) {
            console.error("Missing Google Cloud Config (Project ID or Data Store ID)");
            return "I am having trouble accessing the policy database. Please check server logs.";
        }

        console.log(`\n🔍 Agent Uri: Searching for "${userQuery}"...`);

        // 2. Build the Google Data Store Search Request
        // Construct the serving config path directly (without collections)
        const servingConfig = `projects/${PROJECT_ID}/locations/global/dataStores/${DATA_STORE_ID}/servingConfigs/default_config`;

        const request = {
            servingConfig,
            query: userQuery,
            pageSize: 5, // Fetch top 5 most relevant snippets
            queryExpansionSpec: { condition: 'AUTO' as const },
            spellCorrectionSpec: { mode: 'AUTO' as const },
            contentSearchSpec: {
                snippetSpec: {
                    returnSnippet: true,
                },
                extractiveContentSpec: {
                    maxExtractiveAnswerCount: 3,
                },
            },
        };

        // 3. Execute Search
        const [response] = await searchClient.search(request);

        // 4. Parse Results
        let contextText = "";

        if (response && Array.isArray(response)) {
            // If response is an array of results
            for (const result of response) {
                const data = result.document?.derivedStructData as any;

                const snippet =
                    data?.snippets?.[0]?.snippet ||
                    data?.extractive_answers?.[0]?.content;

                if (snippet) {
                    contextText += `- ${snippet.replace(/\n/g, " ")}\n`;
                }
            }
        } else if (response && (response as any).results) {
            // If response has a results property
            for (const result of (response as any).results) {
                const data = result.document?.derivedStructData as any;

                const snippet =
                    data?.snippets?.[0]?.snippet ||
                    data?.extractive_answers?.[0]?.content;

                if (snippet) {
                    contextText += `- ${snippet.replace(/\n/g, " ")}\n`;
                }
            }
        }

        if (!contextText) {
            console.log("⚠️ No relevant documents found.");
            contextText = "No specific policy documents matched the query.";
        }

        console.log(`✅ Found context (${contextText.length} chars)`);

        // 5. Send to Gemini for Reasoning
        console.log("🤖 Sending context to Gemini 2.5 Flash (us-central1)...");

        const prompt = `You are Uri, an analytical and detail-oriented insurance expert focused on understanding coverages, assessing risks, and generating accurate quotes/recommendations for personal lines (auto and home). You work behind the scenes to provide precise, data-driven outputs based on user info from Sam.

## Core Knowledge
Draw from the policy database context for doctrines (e.g., proximate cause, subrogation), policy structures (e.g., PAP newly acquired auto logic, HO-3 coinsurance), state variations (e.g., PIP in no-fault states, valued policy laws in FL/TX/OH), and emerging risks (e.g., solar panels under Coverage B, TNC gaps).

For coverage recommendations: Calculate TIE (TIE = Liquid + Real + Invested + Future Earnings - Exempt Assets), apply liability matrix (e.g., $500k CSL + $2-3M umbrella for $500k-$2M net worth), trigger umbrella for risk vectors (e.g., teen drivers, pools), detect underinsurance (compare Coverage A to RCV), recommend endorsements (e.g., water backup $10k-25k, ordinance/law 10-25%), and suggest UM/UIM/MedPay/Gap based on state mins and client needs.

## Processing Guidelines
- Receive summaries from Sam: Analyze user details (state, assets, family, risks) factually.
- Perform assessments: Run TIE calc (factor state exemptions), coinsurance penalty if applicable, and gap analysis for endorsements. Recommend RCV over ACV always.
- Generate quotes/recommendations: Structure output with Limits, endorsements, estimated premiums (disclaim as approx.), and rationale (e.g., "Based on your $1M net worth, recommend $2M umbrella to protect assets").
- State compliance: Always check user state for mins (e.g., CA 30/60/15), mandates (e.g., earthquake offer in CA), and warnings (e.g., named storm deductibles in FL).
- If incomplete info: Note what's needed for accurate analysis (e.g., "Need user's state and net worth for accurate TIE").
- Compliance: Factual only—no inventions. Buffer limits for defense costs inside limits. Flag complex cases (e.g., commercial overlap) for human review.

## Output Requirements (CRITICAL)
- Keep responses concise but thorough - aim for 2-4 sentences unless detailed analysis is requested
- Structure your response clearly: start with the direct answer, then supporting rationale
- Use plain text (no markdown formatting) - your output will be reviewed by Rai and presented by Sam
- Be accurate and cite specific coverage details when available from context
- End with clear next steps or what additional info would improve the recommendation

CONTEXT FROM POLICY DATABASE:
${contextText}

USER QUESTION: ${userQuery}

Provide your analysis for Rai's review:`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2048,
            },
        });

        const candidate = result.response.candidates?.[0];
        const finishReason = candidate?.finishReason;
        const answer = candidate?.content?.parts?.[0]?.text || "I couldn't generate a response.";

        if (finishReason && finishReason !== 'STOP') {
            console.warn(`⚠️ [Uri] Generation stopped with reason: ${finishReason}`);
        }
        console.log(`✅ Uri completed analysis (${answer.length} chars)`);

        // RETURN AN OBJECT (required for Rai's review)
        return {
            answer: answer,
            context: contextText
        };

    } catch (error) {
        console.error("❌ Error in Agent Uri:", error);
        return "I encountered an error while analyzing the policy. Please try again later.";
    }
}
