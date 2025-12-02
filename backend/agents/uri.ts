// backend/agents/uri.ts
import { SearchServiceClient } from '@google-cloud/discoveryengine';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// --- CONFIGURATION ---
const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const LOCATION = 'global'; // Vertex Search is almost always 'global'
const DATA_STORE_ID = process.env.GOOGLE_DATA_STORE_ID;

// Initialize Google Search Client
const searchClient = new SearchServiceClient();

// Initialize DeepSeek (Using OpenAI SDK)
const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function handleUriChat(userQuery: string, history: any[]) {
    try {
        // 1. Check if config is present
        if (!PROJECT_ID || !DATA_STORE_ID) {
            console.error("Missing Google Cloud Config (Project ID or Data Store ID)");
            return "I am having trouble accessing the policy database. Please check server logs.";
        }

        console.log(`Agent Uri Searching for: "${userQuery}"...`);

        // 2. Build the Google Search Request
        // This path tells Google exactly which Data Store to look in
        const servingConfig = searchClient.projectLocationCollectionDataStoreServingConfigPath(
            PROJECT_ID,
            LOCATION,
            'default_collection',
            DATA_STORE_ID,
            'default_search'
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

        if (response.results) {
            for (const result of response.results) {
                const data = result.document?.derivedStructData;

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
                    content: `You are Uri, a senior insurance analyst. 
          - You have access to the user's policy documents via the CONTEXT provided below.
          - Answer the user's question using ONLY that context. 
          - If the answer is not in the context, strictly state that you cannot find it in the policy.
          - Be professional, concise, and helpful.`
                },
                {
                    role: "user",
                    content: `CONTEXT FROM DATABASE:\n${contextText}\n\nUSER QUESTION: ${userQuery}`
                }
            ],
            model: "deepseek-chat", // Use "deepseek-reasoner" if you want the R1 model
            temperature: 0.3, // Low temperature for factual accuracy
        });

        return completion.choices[0].message.content || "I couldn't generate a response.";

    } catch (error) {
        console.error("Error in Agent Uri:", error);
        return "I encountered an error while analyzing the policy. Please try again later.";
    }
}