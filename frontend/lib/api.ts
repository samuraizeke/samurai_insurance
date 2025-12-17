// frontend/lib/api.ts
// API client for backend communication with authentication

import { createClient } from './supabase';

// Get backend URL from environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

/**
 * Construct full backend API URL
 * Uses absolute URL to bypass Next.js proxy and avoid timeout issues
 */
function getBackendUrl(path: string): string {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${BACKEND_URL}/${cleanPath}`;
}

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
    userMessageId?: number;
    assistantMessageId?: number;
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

export interface PaginationInfo {
    hasMore: boolean;
    oldestTimestamp: string | null;
    limit: number;
}

export interface ChatHistoryResponse {
    messages: StoredMessage[];
    pagination?: PaginationInfo;
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

        const response = await fetch(getBackendUrl('/api/chat-sessions'), {
            method: "POST",
            headers,
            body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
            // Try to parse error as JSON, fallback to text
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const error = await response.json();
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            } else {
                const text = await response.text();
                throw new Error(text || `HTTP error! status: ${response.status}`);
            }
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
 * Fetch chat history for a session with pagination support
 * @param sessionId - The session ID to fetch messages for
 * @param userId - The user ID (for authorization)
 * @param options - Pagination options: limit (default 50), before (timestamp cursor)
 */
export async function getChatHistory(
    sessionId: number,
    userId: string,
    options?: { limit?: number; before?: string }
): Promise<ChatHistoryResponse> {
    try {
        const token = await getAuthToken();
        const headers: HeadersInit = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Build URL with pagination params
        const params = new URLSearchParams();
        params.set('userId', userId);
        if (options?.limit) params.set('limit', options.limit.toString());
        if (options?.before) params.set('before', options.before);

        const response = await fetch(
            getBackendUrl(`/api/chat-sessions/${sessionId}/messages?${params.toString()}`),
            { headers }
        );

        // Handle 404 (not found) and 403 (not authorized) gracefully
        // These indicate stale session data - return empty to trigger cleanup
        if (response.status === 404 || response.status === 403) {
            console.warn(`Session ${sessionId} not accessible (status: ${response.status})`);
            return { messages: [] };
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return {
            messages: data.messages || [],
            pagination: data.pagination
        };
    } catch (error) {
        console.error("Error fetching chat history:", error);
        return { messages: [] };
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
            getBackendUrl(`/api/users/${userId}/chat-sessions?limit=${limit}`),
            { headers }
        );

        if (!response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                try {
                    const error = await response.json();
                    throw new Error(error.error || `HTTP error! status: ${response.status}`);
                } catch {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
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

        const response = await fetch(getBackendUrl(`/api/chat-sessions/${sessionId}`), {
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

        const response = await fetch(getBackendUrl(`/api/chat-sessions/${sessionId}`), {
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
 * Returns the response text and optional message IDs for feedback
 */
export async function sendChatMessage(
    message: string,
    history: ChatMessage[] = [],
    userId?: string,
    sessionId?: number
): Promise<ChatResponse> {
    try {
        const headers = await getAuthHeaders();

        const response = await fetch(getBackendUrl('/api/chat'), {
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
            // Try to parse error as JSON, fallback to text
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                try {
                    const error = await response.json();
                    throw new Error(error.error || `HTTP error! status: ${response.status}`);
                } catch {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } else {
                const text = await response.text();
                throw new Error(text || `HTTP error! status: ${response.status}`);
            }
        }

        const data: ChatResponse = await response.json();
        return data;
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

        // Create AbortController with 2 minute timeout for long-running document processing
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes

        try {
            const response = await fetch(getBackendUrl('/api/upload-policy'), {
                method: "POST",
                headers,
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            return await handleUploadResponse(response);
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Upload is taking longer than expected. Your document is still being processed. Please refresh the page in a moment to see your policy.'
                };
            }
            throw error;
        }
    } catch (error) {
        console.error("Error uploading policy document:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to upload document"
        };
    }
}

// Helper function to handle upload response
async function handleUploadResponse(response: Response): Promise<UploadResponse> {
    if (!response.ok) {
        // Try to parse error as JSON, fallback to generic error
        const contentType = response.headers.get("content-type");
        let errorMessage = `Upload failed with status ${response.status}`;

        if (contentType && contentType.includes("application/json")) {
            try {
                const data = await response.json();
                errorMessage = data.error || errorMessage;
            } catch {
                // If JSON parsing fails, use generic error
            }
        } else {
            // Non-JSON error (e.g., HTML error page)
            const text = await response.text();
            errorMessage = text || errorMessage;
        }

        return {
            success: false,
            error: errorMessage
        };
    }

    const data = await response.json();
    return {
        success: true,
        message: data.message,
        analysis: data.analysis
    };
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
            getBackendUrl(`/api/users/${userId}/policies`),
            { headers }
        );

        if (!response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                try {
                    const error = await response.json();
                    throw new Error(error.error || `HTTP error! status: ${response.status}`);
                } catch {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.policies || [];
    } catch (error) {
        console.error("Error fetching user policies:", error);
        return [];
    }
}

/**
 * Delete a policy for a user
 */
export async function deleteUserPolicy(userId: string, policyType: PolicyType): Promise<boolean> {
    try {
        const headers = await getAuthHeaders();

        const response = await fetch(
            getBackendUrl(`/api/users/${userId}/policies/${policyType}`),
            {
                method: 'DELETE',
                headers
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error("Error deleting policy:", error);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error deleting policy:", error);
        return false;
    }
}

/**
 * Rename a policy (update carrier name)
 */
export async function renameUserPolicy(userId: string, policyType: PolicyType, newCarrier: string): Promise<boolean> {
    try {
        const headers = await getAuthHeaders();

        const response = await fetch(
            getBackendUrl(`/api/users/${userId}/policies/${policyType}`),
            {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ carrier: newCarrier })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error("Error renaming policy:", error);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error renaming policy:", error);
        return false;
    }
}

/**
 * Check if an email already exists in the system (for signup validation)
 * @param email - The email to check
 * @returns Object with exists boolean and optional error
 */
export async function checkEmailExists(email: string): Promise<{ exists: boolean; error?: string }> {
    try {
        const response = await fetch(getBackendUrl('/api/auth/check-email'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                return { exists: false, error: data.error || 'Failed to check email' };
            }
            return { exists: false, error: 'Failed to check email' };
        }

        const data = await response.json();
        return { exists: data.exists };
    } catch (error) {
        console.error("Error checking email:", error);
        return { exists: false, error: 'Failed to check email' };
    }
}
