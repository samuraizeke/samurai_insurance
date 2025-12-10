// backend/middleware/rateLimiter.ts
// Rate limiting configuration for API endpoints

import rateLimit from 'express-rate-limit';

// ============================================
// Rate Limiter Configurations
// ============================================

/**
 * General API rate limiter
 * 100 requests per minute per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    error: 'Too many requests, please try again later',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development
  skip: () => process.env.NODE_ENV === 'development'
});

/**
 * Chat endpoint rate limiter
 * 30 messages per minute per IP (generous for active conversations)
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    error: 'Too many chat messages. Please wait a moment before sending more.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development'
});

/**
 * Document upload rate limiter
 * 10 uploads per minute per IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    error: 'Upload limit exceeded. Please wait before uploading more documents.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development'
});

/**
 * Session creation rate limiter
 * 20 new sessions per minute per IP
 */
export const sessionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: {
    error: 'Too many session creation requests. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development'
});

/**
 * Strict rate limiter for authentication-sensitive endpoints
 * 10 requests per minute per IP
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    error: 'Rate limit exceeded. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development'
});
