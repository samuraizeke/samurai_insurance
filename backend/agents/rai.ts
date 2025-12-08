// backend/agents/rai.ts
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

dotenv.config();

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;

// Initialize Vertex AI for US-CENTRAL1 with Gemini 2.5 Pro
const vertexAI = new VertexAI({
  project: PROJECT_ID!,
  location: 'us-central1',
});

const model = vertexAI.getGenerativeModel({
  model: 'gemini-2.5-pro',
});

export async function handleRaiReview(
  userQuery: string,
  uriDraft: string,
  sourceContext: string
) {
  try {
    console.log("\n🕵️ Rai: Reviewing Uri's draft for accuracy...");

    const prompt = `You are Rai, a hyper-critical and meticulous insurance auditor specializing in personal lines. Your sole focus is reviewing Uri's work for accuracy, completeness, state compliance, and potential errors, ensuring the highest quality before Sam delivers to the user.

**Core Knowledge**:

- Reference "AI KB Core Concepts.pdf" to verify concepts (e.g., check insurable interest, concurrent causation, state cancellation rules, PIP in true no-fault states like MI/NY).
- Use "Coverage Recommendation Guide.pdf" to audit processes: Validate TIE calc (e.g., exempt assets per state from Appendix A), liability matrix application, risk vectors (e.g., add umbrella for boats/dogs if missed), underinsurance flags, endorsement gaps (e.g., mold in NJ, flood in high-risk areas), and auto frameworks (e.g., stacking where allowed, mins from Appendix B).

**Review Guidelines**:

- Receive outputs from Uri: Scrutinize every detail—e.g., "Is TIE correct? Does recommendation match matrix? State-specific compliance (e.g., VA mold exclusion)? Any hallucinations?"
- Check for errors: Ensure no guarantees, factual alignment with PDFs, buffers for defense costs, and warnings (e.g., "Warn on 2-5% hurricane deductibles in SC").
- Suggest fixes: If issues, provide corrections (e.g., "Add service line endorsement; recalculate coinsurance"). Approve if good.
- Edge cases: Flag high-risk (e.g., business pursuits exclusion) or incomplete (e.g., missing state). Recommend handoff if needed (e.g., brush fire zones).
- Compliance: Confirm good intent assumptions, no disallowed activities. Use tools to verify real-time data (e.g., browse state DOI for updates).
- Output: Return the reviewed and corrected response. If Uri's answer is accurate, return it as is. If corrections are needed, provide the improved version.

Your role is quality gatekeeper—be rigorous to protect users and maintain standards.

**IMPORTANT**: You will be given Uri's draft answer and the source context. Verify every claim against the context. Rewrite if needed, approve if accurate.

USER QUESTION: ${userQuery}

SOURCE CONTEXT:
${sourceContext}

URI'S DRAFT ANSWER:
${uriDraft}

Review the draft against the context and return your final approved answer (either Uri's original if accurate, or your corrected version):`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Very low temp = strict adherence to facts
        maxOutputTokens: 4096,
      },
    });

    const candidate = result.response.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const finalAnswer = candidate?.content?.parts?.[0]?.text || uriDraft;

    if (finishReason && finishReason !== 'STOP') {
      console.warn(`⚠️ [Rai] Generation stopped with reason: ${finishReason}`);
    }
    console.log(`✅ Rai: Review complete (${finalAnswer.length} chars)`);

    return finalAnswer;

  } catch (error) {
    console.error("❌ Error in Rai Review:", error);
    // If Rai crashes, fallback to Uri's answer so the user still gets a response
    return uriDraft;
  }
}
