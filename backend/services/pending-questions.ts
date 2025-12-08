// backend/services/pending-questions.ts
// Simple in-memory store for pending questions
// In production, this should use a database (Supabase, Redis, etc.)

interface PendingQuestion {
    accountIdentifier: string;
    question: string;
    timestamp: number;
}

// Map of account_identifier -> pending question
const pendingQuestions = new Map<string, PendingQuestion>();

export function storePendingQuestion(accountIdentifier: string, question: string): void {
    pendingQuestions.set(accountIdentifier, {
        accountIdentifier,
        question,
        timestamp: Date.now()
    });
    console.log(`📝 Stored pending question for ${accountIdentifier}: "${question}"`);
}

export function getPendingQuestion(accountIdentifier: string): PendingQuestion | undefined {
    return pendingQuestions.get(accountIdentifier);
}

export function clearPendingQuestion(accountIdentifier: string): void {
    pendingQuestions.delete(accountIdentifier);
    console.log(`🗑️ Cleared pending question for ${accountIdentifier}`);
}

export function hasPendingQuestion(accountIdentifier: string): boolean {
    return pendingQuestions.has(accountIdentifier);
}
