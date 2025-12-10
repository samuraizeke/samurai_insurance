// frontend/lib/api.ts
// API client for backend communication with authentication

import { createClient } from './supabase';

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

export type PolicyType = 'auto' | 'home' | 'renters' | 'umbrella' | 'life' | 'health' | 'other';

export interface UserPolicy {
    policyType: PolicyType;
    carrier: string;
    analysis: string;
    uploadedAt: string;
    fileName: string;
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

// Session storage keys
const SESSION_ID_KEY = 'samurai_chat_session_id';
const SESSION_UUID_KEY = 'samurai_chat_session_uuid';

/**
 * Get the current auth token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
    try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
}

/**
 * Create headers with authentication token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
    const token = await getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

/**
 * Create a new chat session for a user
 */
export async function createChatSession(userId: string): Promise<{ sessionId: number; sessionUuid: string } | null> {
    try {
        const headers = await getAuthHeaders();

        const response = await fetch('/api/chat-sessions', {
            method: "POST",
            headers,
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
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(SESSION_ID_KEY);
    return stored ? parseInt(stored, 10) : null;
}

/**
 * Clear the stored session (for starting a new conversation)
 */
export function clearStoredSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(SESSION_UUID_KEY);
}

/**
 * Fetch chat history for a session
 */
export async function getChatHistory(sessionId: number, userId: string): Promise<StoredMessage[]> {
    try {
        const token = await getAuthToken();
        const headers: HeadersInit = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
            `/api/chat-sessions/${sessionId}/messages?userId=${encodeURIComponent(userId)}`,
            { headers }
        );

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
        const token = await getAuthToken();
        const headers: HeadersInit = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
            `/api/users/${userId}/chat-sessions?limit=${limit}`,
            { headers }
        );

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
 * Rename a chat session by updating its summary
 */
export async function renameSession(sessionId: number, userId: string, newName: string): Promise<boolean> {
    try {
        const headers = await getAuthHeaders();

        const response = await fetch(`/api/chat-sessions/${sessionId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ userId, summary: newName }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Error renaming session:", error);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error renaming session:", error);
        return false;
    }
}

/**
 * Soft delete a chat session (hides from UI but retains in database)
 */
export async function deleteSession(sessionId: number, userId: string): Promise<boolean> {
    try {
        const headers = await getAuthHeaders();

        const response = await fetch(`/api/chat-sessions/${sessionId}`, {
            method: "DELETE",
            headers,
            body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Error deleting session:", error);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error deleting session:", error);
        return false;
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
        const headers = await getAuthHeaders();

        const response = await fetch('/api/chat', {
            method: "POST",
            headers,
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

/**
 * Upload a policy document for analysis
 */
export async function uploadPolicyDocument(
    file: File,
    sessionId?: string,
    userId?: string
): Promise<UploadResponse> {
    try {
        const token = await getAuthToken();

        const formData = new FormData();
        formData.append('document', file);
        if (sessionId) {
            formData.append('sessionId', sessionId);
        }
        if (userId) {
            formData.append('userId', userId);
        }

        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        // Note: Don't set Content-Type for FormData - browser will set it with boundary

        const response = await fetch('/api/upload-policy', {
            method: "POST",
            headers,
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

/**
 * Get all uploaded policies for a user
 */
export async function getUserPolicies(userId: string): Promise<UserPolicy[]> {
    try {
        const token = await getAuthToken();
        const headers: HeadersInit = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
            `/api/users/${userId}/policies`,
            { headers }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.policies || [];
    } catch (error) {
        console.error("Error fetching user policies:", error);
        return [];
    }
}
