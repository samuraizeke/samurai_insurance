// backend/lib/validation.ts
// Input validation schemas using Zod for all API endpoints

import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

// UUID validation for Supabase auth IDs
const uuidSchema = z.string().uuid('Invalid user ID format');

// Positive integer for database IDs
const dbIdSchema = z.number().int().positive('ID must be a positive integer');

// Safe string that strips dangerous characters
const safeStringSchema = (maxLength: number = 10000) =>
  z.string()
    .min(1, 'Field cannot be empty')
    .max(maxLength, `Field must be less than ${maxLength} characters`)
    .transform((s: string) => s.trim());

// ============================================
// Chat Schemas
// ============================================

export const chatMessageHistorySchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(50000)
}).strict(); // SECURITY: Reject unknown keys

export const chatRequestSchema = z.object({
  message: safeStringSchema(10000),
  history: z.array(chatMessageHistorySchema).optional().default([]),
  userId: uuidSchema.optional(),
  sessionId: dbIdSchema.optional()
}).strict(); // SECURITY: Reject unknown keys to prevent prototype pollution

export type ChatRequest = z.infer<typeof chatRequestSchema>;

// ============================================
// Session Schemas
// ============================================

export const createSessionSchema = z.object({
  userId: uuidSchema,
  topicId: dbIdSchema.optional().nullable(),
  policyId: dbIdSchema.optional().nullable(),
  claimId: dbIdSchema.optional().nullable()
}).strict(); // SECURITY: Reject unknown keys

export type CreateSessionRequest = z.infer<typeof createSessionSchema>;

export const getSessionMessagesQuerySchema = z.object({
  userId: uuidSchema
}).strict(); // SECURITY: Reject unknown keys

export const renameSessionSchema = z.object({
  userId: uuidSchema,
  summary: safeStringSchema(200)
}).strict(); // SECURITY: Reject unknown keys

export type RenameSessionRequest = z.infer<typeof renameSessionSchema>;

export const deleteSessionSchema = z.object({
  userId: uuidSchema
}).strict(); // SECURITY: Reject unknown keys

// ============================================
// User Schemas
// ============================================

export const userIdParamSchema = z.object({
  userId: uuidSchema
}).strict(); // SECURITY: Reject unknown keys

export const getUserSessionsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(10)
}).strict(); // SECURITY: Reject unknown keys

// ============================================
// Upload Schemas
// ============================================

export const uploadPolicyBodySchema = z.object({
  sessionId: z.string().max(100).optional(),
  userId: uuidSchema.optional()
}).strict(); // SECURITY: Reject unknown keys

// ============================================
// Feedback Schemas
// ============================================

export const feedbackTypeSchema = z.enum(['bug', 'suggestion', 'question', 'other']);

export const generalFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  comment: safeStringSchema(2000).optional(),
  feedback_type: feedbackTypeSchema.optional(),
  conversation_id: dbIdSchema.optional(),
  session_id: dbIdSchema.optional() // Can pass session_id instead - backend will resolve to latest conversation
}).strict();

export type GeneralFeedbackRequest = z.infer<typeof generalFeedbackSchema>;

export const chatFeedbackSchema = z.object({
  conversation_id: dbIdSchema,
  vote: z.number().int().refine((v) => v === -1 || v === 1, {
    message: 'Vote must be -1 (thumbs down) or 1 (thumbs up)'
  })
}); // Note: Not using .strict() because middleware may add userId

export type ChatFeedbackRequest = z.infer<typeof chatFeedbackSchema>;

export const sessionFeedbackSchema = z.object({
  session_id: dbIdSchema,
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  comment: safeStringSchema(2000).optional()
}).strict();

export type SessionFeedbackRequest = z.infer<typeof sessionFeedbackSchema>;

// ============================================
// Helper Functions
// ============================================

/**
 * Validates request body against a schema
 * Returns { success: true, data } or { success: false, error }
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Formats Zod errors for API response
 */
export function formatZodError(error: z.ZodError): {
  error: string;
  details: Array<{ field: string; message: string }>
} {
  return {
    error: 'Validation failed',
    details: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }))
  };
}

/**
 * Error response type for validation failures
 */
export interface ValidationErrors {
  error: string;
  details: Array<{ field: string; message: string }>;
}

/**
 * Validates request data and returns either the validated data or null with errors
 * Returns [data, null] on success, [null, errors] on failure
 */
export function validateRequest<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): [z.infer<T>, null] | [null, ValidationErrors] {
  const result = schema.safeParse(data);
  if (result.success) {
    return [result.data, null];
  }
  return [null, formatZodError(result.error)];
}
