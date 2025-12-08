// frontend/lib/api.ts

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface ChatRequest {
    message: string;
    history?: ChatMessage[];
    userId?: string;
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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export async function sendChatMessage(
    message: string,
    history: ChatMessage[] = [],
    userId?: string
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
