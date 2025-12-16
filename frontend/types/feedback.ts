// frontend/types/feedback.ts
// TypeScript definitions for feedback system

// ============================================
// General Feedback (feedback table)
// ============================================

export type FeedbackType = 'bug' | 'suggestion' | 'question' | 'other';

export interface GeneralFeedback {
  id: number;
  conversation_id: number | null;
  user_id: number | null;
  rating: number; // 1-5
  comment: string | null;
  feedback_type: FeedbackType | null;
  created_at: string;
}

export interface GeneralFeedbackRequest {
  rating: number; // 1-5
  comment?: string;
  feedback_type?: FeedbackType;
  conversation_id?: number; // Optional: link to specific conversation
  session_id?: number; // Optional: link to specific session (backend will resolve to latest conversation)
}

export interface GeneralFeedbackResponse {
  success: boolean;
  message?: string;
  error?: string;
  feedbackId?: number;
}

// ============================================
// Chat Message Feedback (chat_feedback table)
// ============================================

export type ChatVote = -1 | 1; // -1 = thumbs down, 1 = thumbs up

export interface ChatFeedback {
  id: number;
  conversation_id: number;
  user_id: number;
  vote: ChatVote;
  created_at: string;
}

export interface ChatFeedbackRequest {
  conversation_id: number;
  vote: ChatVote;
}

export interface ChatFeedbackResponse {
  success: boolean;
  message?: string;
  error?: string;
  vote?: ChatVote; // Returns the current vote state
}

// ============================================
// Session Feedback (uses feedback table with session context)
// ============================================

export interface SessionFeedbackRequest {
  session_id: number;
  rating: number; // 1-5
  comment?: string;
}

// ============================================
// Feedback Summary Types (from chat_feedback_summary view)
// ============================================

export interface UserFeedbackSummary {
  user_id: number;
  name: string;
  avg_rating: number;
  total_feedbacks: number;
}
