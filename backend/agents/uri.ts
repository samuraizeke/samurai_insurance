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
                    content: `You are Uri, an insurance expert. Answer questions BRIEFLY using the CONTEXT provided.

**Rules**:
- Keep answers to 2-3 sentences MAX
- Get straight to the point
- Use CONTEXT from policy database when available
- For general questions, use your insurance expertise
- Be accurate but concise
- Skip long explanations

Answer the user's question directly and briefly.`
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