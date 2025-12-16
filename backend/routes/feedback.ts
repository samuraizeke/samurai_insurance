// backend/routes/feedback.ts
// Feedback API routes for general feedback and chat message feedback

import express from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { requireAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import {
  generalFeedbackSchema,
  chatFeedbackSchema,
  sessionFeedbackSchema,
  validateRequest
} from '../lib/validation';

const router = express.Router();

// ============================================
// Helper: Get internal user ID from external ID
// ============================================
async function getInternalUserId(externalId: string): Promise<number | null> {
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('external_id', externalId)
    .single();

  return userData?.id || null;
}

// ============================================
// POST /api/feedback - Submit general feedback
// ============================================
router.post('/', generalLimiter, requireAuth, async (req, res) => {
  try {
    // Validate request body
    const [validatedData, validationErrors] = validateRequest(generalFeedbackSchema, req.body);

    if (validationErrors) {
      return res.status(400).json(validationErrors);
    }

    const { rating, comment, feedback_type, conversation_id, session_id } = validatedData;
    const userId = req.user!.id;

    // Get internal user ID
    const internalUserId = await getInternalUserId(userId);
    if (!internalUserId) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Resolve conversation_id - either directly provided or from session_id
    let resolvedConversationId = conversation_id || null;

    // If session_id provided, resolve to most recent conversation and verify ownership
    if (session_id && !conversation_id) {
      // Verify session belongs to user
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('user_id')
        .eq('id', session_id)
        .single();

      if (!session || session.user_id !== internalUserId) {
        return res.status(403).json({ error: 'Not authorized to provide feedback for this session' });
      }

      // Get most recent conversation from session
      const { data: lastConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('session_id', session_id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      resolvedConversationId = lastConversation?.id || null;
    }

    // If conversation_id provided directly, verify it belongs to user
    if (conversation_id) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('session_id')
        .eq('id', conversation_id)
        .single();

      if (conversation) {
        const { data: session } = await supabase
          .from('chat_sessions')
          .select('user_id')
          .eq('id', conversation.session_id)
          .single();

        if (session && session.user_id !== internalUserId) {
          return res.status(403).json({ error: 'Not authorized to provide feedback for this conversation' });
        }
      }
    }

    // Insert feedback
    const { data: feedback, error: insertError } = await supabase
      .from('feedback')
      .insert({
        user_id: internalUserId,
        rating,
        comment: comment || null,
        feedback_type: feedback_type || null,
        conversation_id: resolvedConversationId,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) {
      logger.error('Failed to insert feedback', insertError);
      return res.status(500).json({ error: 'Failed to submit feedback' });
    }

    logger.info('Feedback submitted', { feedbackId: feedback.id, rating, feedback_type, sessionId: session_id, conversationId: resolvedConversationId });
    res.json({
      success: true,
      message: 'Thank you for your feedback!',
      feedbackId: feedback.id
    });

  } catch (error) {
    logger.error('Error submitting feedback', error);
    res.status(500).json({ error: 'Failed to submit feedback. Please try again.' });
  }
});

// ============================================
// POST /api/feedback/chat - Submit chat message feedback (thumbs up/down)
// ============================================
router.post('/chat', generalLimiter, requireAuth, async (req, res) => {
  try {
    // Debug logging
    logger.info('Chat feedback request body:', { body: req.body, bodyType: typeof req.body });

    // Validate request body
    const [validatedData, validationErrors] = validateRequest(chatFeedbackSchema, req.body);

    if (validationErrors) {
      logger.warn('Chat feedback validation failed:', { errors: validationErrors, body: req.body });
      return res.status(400).json(validationErrors);
    }

    const { conversation_id, vote } = validatedData;
    const userId = req.user!.id;

    // Get internal user ID
    const internalUserId = await getInternalUserId(userId);
    if (!internalUserId) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify conversation exists and belongs to user's session
    const { data: conversation } = await supabase
      .from('conversations')
      .select('session_id')
      .eq('id', conversation_id)
      .single();

    if (!conversation) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const { data: session } = await supabase
      .from('chat_sessions')
      .select('user_id')
      .eq('id', conversation.session_id)
      .single();

    if (!session || session.user_id !== internalUserId) {
      return res.status(403).json({ error: 'Not authorized to provide feedback for this message' });
    }

    // Upsert feedback (update if exists, insert if new)
    const { data: existingFeedback } = await supabase
      .from('chat_feedback')
      .select('id, vote')
      .eq('conversation_id', conversation_id)
      .eq('user_id', internalUserId)
      .single();

    if (existingFeedback) {
      // If same vote, remove it (toggle off)
      if (existingFeedback.vote === vote) {
        const { error: deleteError } = await supabase
          .from('chat_feedback')
          .delete()
          .eq('id', existingFeedback.id);

        if (deleteError) {
          logger.error('Failed to remove chat feedback', deleteError);
          return res.status(500).json({ error: 'Failed to update feedback' });
        }

        logger.info('Chat feedback removed', { conversation_id });
        return res.json({
          success: true,
          message: 'Feedback removed',
          vote: null
        });
      }

      // Update to new vote
      const { error: updateError } = await supabase
        .from('chat_feedback')
        .update({ vote, created_at: new Date().toISOString() })
        .eq('id', existingFeedback.id);

      if (updateError) {
        logger.error('Failed to update chat feedback', updateError);
        return res.status(500).json({ error: 'Failed to update feedback' });
      }

      logger.info('Chat feedback updated', { conversation_id, vote });
      return res.json({
        success: true,
        message: 'Feedback updated',
        vote
      });
    }

    // Insert new feedback
    const { error: insertError } = await supabase
      .from('chat_feedback')
      .insert({
        conversation_id,
        user_id: internalUserId,
        vote,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      logger.error('Failed to insert chat feedback', insertError);
      return res.status(500).json({ error: 'Failed to submit feedback' });
    }

    logger.info('Chat feedback submitted', { conversation_id, vote });
    res.json({
      success: true,
      message: vote === 1 ? 'Thanks for the positive feedback!' : 'Thanks for your feedback. We\'ll work to improve.',
      vote
    });

  } catch (error) {
    logger.error('Error submitting chat feedback', error);
    res.status(500).json({ error: 'Failed to submit feedback. Please try again.' });
  }
});

// ============================================
// GET /api/feedback/chat/:conversationId - Get feedback for a message
// ============================================
router.get('/chat/:conversationId', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;

    // Get internal user ID
    const internalUserId = await getInternalUserId(userId);
    if (!internalUserId) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's feedback for this message
    const { data: feedback } = await supabase
      .from('chat_feedback')
      .select('vote')
      .eq('conversation_id', parseInt(conversationId, 10))
      .eq('user_id', internalUserId)
      .single();

    res.json({
      vote: feedback?.vote || null
    });

  } catch (error) {
    logger.error('Error fetching chat feedback', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// ============================================
// POST /api/feedback/session - Submit session-level feedback
// ============================================
router.post('/session', generalLimiter, requireAuth, async (req, res) => {
  try {
    // Validate request body
    const [validatedData, validationErrors] = validateRequest(sessionFeedbackSchema, req.body);

    if (validationErrors) {
      return res.status(400).json(validationErrors);
    }

    const { session_id, rating, comment } = validatedData;
    const userId = req.user!.id;

    // Get internal user ID
    const internalUserId = await getInternalUserId(userId);
    if (!internalUserId) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify session belongs to user
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('user_id')
      .eq('id', session_id)
      .single();

    if (!session || session.user_id !== internalUserId) {
      return res.status(403).json({ error: 'Not authorized to provide feedback for this session' });
    }

    // Get the most recent conversation from this session to link feedback
    const { data: lastConversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('session_id', session_id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    // Insert feedback linked to session's conversation
    const { data: feedback, error: insertError } = await supabase
      .from('feedback')
      .insert({
        user_id: internalUserId,
        conversation_id: lastConversation?.id || null,
        rating,
        comment: comment || null,
        feedback_type: 'session_rating',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) {
      logger.error('Failed to insert session feedback', insertError);
      return res.status(500).json({ error: 'Failed to submit feedback' });
    }

    // Update session with rating
    await supabase
      .from('chat_sessions')
      .update({ rating_avg: rating })
      .eq('id', session_id);

    logger.info('Session feedback submitted', { session_id, feedbackId: feedback.id, rating });
    res.json({
      success: true,
      message: 'Thank you for rating this conversation!',
      feedbackId: feedback.id
    });

  } catch (error) {
    logger.error('Error submitting session feedback', error);
    res.status(500).json({ error: 'Failed to submit feedback. Please try again.' });
  }
});

export default router;
