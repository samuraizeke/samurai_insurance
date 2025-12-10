// backend/middleware/auth.ts
// Authentication middleware for verifying JWT tokens and preventing IDOR attacks

import { Request, Response, NextFunction } from 'express';
import { createClient, User } from '@supabase/supabase-js';

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      internalUserId?: number;
    }
  }
}

// Create a Supabase client for auth verification
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Auth middleware: Missing Supabase environment variables');
}

const supabaseAuth = createClient(supabaseUrl!, supabaseServiceKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Middleware that requires authentication via Bearer token.
 * Verifies the JWT and attaches the user to the request.
 * Also validates that any userId in the request matches the authenticated user.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.slice(7);

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    // Verify the token with Supabase
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    if (error || !user) {
      console.warn('⚠️ Auth failed:', error?.message || 'No user found');
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Attach verified user to request
    req.user = user;

    // Check for userId mismatch (IDOR prevention)
    const providedUserId = req.body?.userId || req.params?.userId || req.query?.userId;

    if (providedUserId && providedUserId !== user.id) {
      console.warn(`⚠️ IDOR attempt: User ${user.id} tried to access data for ${providedUserId}`);
      res.status(403).json({ error: 'Access denied: User ID mismatch' });
      return;
    }

    // If userId was provided in body/params/query, ensure it's the authenticated user's ID
    // This normalizes the userId to always be the authenticated user
    if (req.body && typeof req.body === 'object') {
      req.body.userId = user.id;
    }

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication service unavailable' });
  }
}

/**
 * Optional authentication - doesn't require auth but will attach user if valid token present.
 * Useful for endpoints that behave differently for authenticated vs anonymous users.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      // No auth header - continue without user
      next();
      return;
    }

    const token = authHeader.slice(7);

    if (!token) {
      next();
      return;
    }

    // Try to verify the token
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    if (!error && user) {
      req.user = user;

      // Normalize userId in body if present
      if (req.body && typeof req.body === 'object' && req.body.userId) {
        req.body.userId = user.id;
      }
    }

    next();
  } catch (error) {
    // On error, continue without user (optional auth)
    console.warn('⚠️ Optional auth error:', error);
    next();
  }
}

/**
 * Middleware to look up and attach the internal database user ID.
 * Should be used after requireAuth for endpoints that need the internal ID.
 */
export async function attachInternalUserId(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const { data: userData, error } = await supabaseAuth
      .from('users')
      .select('id')
      .eq('external_id', req.user.id)
      .single();

    if (error || !userData) {
      // User exists in auth but not in users table - will be created by the endpoint
      req.internalUserId = undefined;
    } else {
      req.internalUserId = userData.id;
    }

    next();
  } catch (error) {
    console.error('❌ Error looking up internal user ID:', error);
    next(); // Continue anyway - endpoint can handle missing internal ID
  }
}
