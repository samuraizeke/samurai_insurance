// frontend/lib/api.ts

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface ChatRequest {
    message: string;
    history?: ChatMessage[];
    userId?: string;
    sessionId?: number;
}

export interface ChatResponse {
    response: string;
}

export interface UploadResponse {
    success: boolean;
    message?: string;
    analysis?: string;
    error?: string;
}

export interface ChatSession {
    id: number;
    session_uuid: string;
    started_at: string;
    last_message_at: string;
    total_messages: number;
    conversation_context?: string;
    first_message?: string;
    summary?: string;
    active: boolean;
}

export interface StoredMessage {
    id: string;
    content: string;
    role: "user" | "assistant";
    timestamp: string;
    intent?: string;
    entities?: Record<string, unknown>;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

// Session storage keys
const SESSION_ID_KEY = 'samurai_chat_session_id';
const SESSION_UUID_KEY = 'samurai_chat_session_uuid';

/**
 * Create a new chat session for a user
 */
export async function createChatSession(userId: string): Promise<{ sessionId: number; sessionUuid: string } | null> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/chat-sessions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Store in localStorage for persistence
        localStorage.setItem(SESSION_ID_KEY, data.sessionId.toString());
        localStorage.setItem(SESSION_UUID_KEY, data.sessionUuid);

        return {
            sessionId: data.sessionId,
            sessionUuid: data.sessionUuid
        };
    } catch (error) {
        console.error("Error creating chat session:", error);
        return null;
    }
}

/**
 * Get the current session ID from localStorage
 */
export function getStoredSessionId(): number | null {
    const stored = localStorage.getItem(SESSION_ID_KEY);
    return stored ? parseInt(stored, 10) : null;
}

/**
 * Clear the stored session (for starting a new conversation)
 */
export function clearStoredSession(): void {
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(SESSION_UUID_KEY);
}

/**
 * Fetch chat history for a session
 */
export async function getChatHistory(sessionId: number): Promise<StoredMessage[]> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/chat-sessions/${sessionId}/messages`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.messages || [];
    } catch (error) {
        console.error("Error fetching chat history:", error);
        return [];
    }
}

/**
 * Get user's recent chat sessions
 */
export async function getUserSessions(userId: string, limit: number = 10): Promise<ChatSession[]> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/users/${userId}/chat-sessions?limit=${limit}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.sessions || [];
    } catch (error) {
        console.error("Error fetching user sessions:", error);
        return [];
    }
}

/**
 * Send a chat message with session tracking
 */
export async function sendChatMessage(
    message: string,
    history: ChatMessage[] = [],
    userId?: string,
    sessionId?: number
): Promise<string> {
    try {
        const response = await fetch(`${BACKEND_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message,
                history,
                userId,
                sessionId,
            } as ChatRequest),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ChatResponse = await response.json();
        return data.response;
    } catch (error) {
        console.error("Error sending chat message:", error);
        throw error;
    }
}

export async function uploadPolicyDocument(
    file: File,
    sessionId?: string,
    userId?: string
): Promise<UploadResponse> {
    try {
        const formData = new FormData();
        formData.append('document', file);
        if (sessionId) {
            formData.append('sessionId', sessionId);
        }
        if (userId) {
            formData.append('userId', userId);
        }

        const response = await fetch(`${BACKEND_URL}/api/upload-policy`, {
            method: "POST",
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || `Upload failed with status ${response.status}`
            };
        }

        return {
            success: true,
            message: data.message,
            analysis: data.analysis
        };
    } catch (error) {
        console.error("Error uploading policy document:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to upload document"
        };
    }
}
