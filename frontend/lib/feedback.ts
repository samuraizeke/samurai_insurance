// frontend/lib/feedback.ts
// API client for feedback operations

import { createClient } from './supabase';
import type {
  GeneralFeedbackRequest,
  GeneralFeedbackResponse,
  ChatFeedbackRequest,
  ChatFeedbackResponse,
  SessionFeedbackRequest,
  ChatVote
} from '../types/feedback';

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

// ============================================
// General Feedback API
// ============================================

/**
 * Submit general feedback (bugs, suggestions, etc.)
 */
export async function submitGeneralFeedback(
  feedback: GeneralFeedbackRequest
): Promise<GeneralFeedbackResponse> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers,
      body: JSON.stringify(feedback),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Failed with status ${response.status}`
      };
    }

    return {
      success: true,
      message: data.message,
      feedbackId: data.feedbackId
    };
  } catch (error) {
    console.error('Error submitting general feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit feedback'
    };
  }
}

// ============================================
// Chat Message Feedback API
// ============================================

/**
 * Submit thumbs up/down feedback for a chat message
 * Returns the current vote state (null if toggled off)
 */
export async function submitChatFeedback(
  feedback: ChatFeedbackRequest
): Promise<ChatFeedbackResponse> {
  try {
    const headers = await getAuthHeaders();

    // Debug: log what we're sending
    console.log('Submitting chat feedback:', feedback);

    const response = await fetch('/api/feedback/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify(feedback),
    });

    const data = await response.json();

    if (!response.ok) {
      // Log detailed validation errors for debugging
      console.error('Chat feedback error response:', data);
      return {
        success: false,
        error: data.error || `Failed with status ${response.status}`
      };
    }

    return {
      success: true,
      message: data.message,
      vote: data.vote
    };
  } catch (error) {
    console.error('Error submitting chat feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit feedback'
    };
  }
}

/**
 * Get the user's current feedback vote for a message
 */
export async function getChatFeedback(
  conversationId: number
): Promise<ChatVote | null> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`/api/feedback/chat/${conversationId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.vote;
  } catch (error) {
    console.error('Error fetching chat feedback:', error);
    return null;
  }
}

// ============================================
// Session Feedback API
// ============================================

/**
 * Submit feedback for an entire chat session
 */
export async function submitSessionFeedback(
  feedback: SessionFeedbackRequest
): Promise<GeneralFeedbackResponse> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch('/api/feedback/session', {
      method: 'POST',
      headers,
      body: JSON.stringify(feedback),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Failed with status ${response.status}`
      };
    }

    return {
      success: true,
      message: data.message,
      feedbackId: data.feedbackId
    };
  } catch (error) {
    console.error('Error submitting session feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit feedback'
    };
  }
}
