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

        const prompt = `You are Uri, an insurance expert. Answer questions BRIEFLY using the CONTEXT provided.

**Rules**:
- Keep answers to 2-3 sentences MAX
- Get straight to the point
- Use CONTEXT from policy database when available
- For general questions, use your insurance expertise
- Be accurate but concise
- Skip long explanations

CONTEXT FROM POLICY DATABASE:
${contextText}

USER QUESTION: ${userQuery}

Answer the user's question directly and briefly.`;

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
