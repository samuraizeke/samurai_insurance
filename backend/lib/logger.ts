// backend/lib/logger.ts
// Structured JSON logging for Google Cloud Logging integration
// Enables request tracing and forensic analysis

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Severity levels compatible with Google Cloud Logging
type LogSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

interface LogEntry {
  severity: LogSeverity;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  labels?: Record<string, string>;
  httpRequest?: {
    requestMethod?: string;
    requestUrl?: string;
    status?: number;
    userAgent?: string;
    remoteIp?: string;
    latency?: string;
  };
  [key: string]: unknown;
}

// Store for request context (using AsyncLocalStorage would be ideal, but this works for sync contexts)
let currentRequestId: string | undefined;
let currentUserId: string | undefined;

/**
 * Set the current request context for logging
 */
export function setRequestContext(requestId: string, userId?: string): void {
  currentRequestId = requestId;
  currentUserId = userId;
}

/**
 * Clear the current request context
 */
export function clearRequestContext(): void {
  currentRequestId = undefined;
  currentUserId = undefined;
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Format and output a structured log entry
 */
function writeLog(entry: LogEntry): void {
  // In production, output JSON for Cloud Logging
  // In development, output human-readable format
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(entry));
  } else {
    const prefix = entry.requestId ? `[${entry.requestId.slice(0, 8)}]` : '';
    const userPrefix = entry.userId ? `[user:${entry.userId.slice(0, 8)}]` : '';
    const severityIcon = {
      DEBUG: '🔍',
      INFO: 'ℹ️ ',
      WARNING: '⚠️ ',
      ERROR: '❌',
      CRITICAL: '🚨'
    }[entry.severity];

    console.log(`${severityIcon} ${prefix}${userPrefix} ${entry.message}`);

    // Log additional context if present
    if (entry.httpRequest) {
      console.log(`   ${entry.httpRequest.requestMethod} ${entry.httpRequest.requestUrl} -> ${entry.httpRequest.status || 'pending'}`);
    }
  }
}

/**
 * Create a log entry with common fields
 */
function createLogEntry(severity: LogSeverity, message: string, extra?: Record<string, unknown>): LogEntry {
  return {
    severity,
    message,
    timestamp: new Date().toISOString(),
    requestId: currentRequestId,
    userId: currentUserId,
    ...extra
  };
}

/**
 * Structured logger with severity levels
 */
export const logger = {
  debug(message: string, extra?: Record<string, unknown>): void {
    writeLog(createLogEntry('DEBUG', message, extra));
  },

  info(message: string, extra?: Record<string, unknown>): void {
    writeLog(createLogEntry('INFO', message, extra));
  },

  warn(message: string, extra?: Record<string, unknown>): void {
    writeLog(createLogEntry('WARNING', message, extra));
  },

  error(message: string, error?: Error | unknown, extra?: Record<string, unknown>): void {
    const errorDetails: Record<string, unknown> = { ...extra };

    if (error instanceof Error) {
      errorDetails.errorName = error.name;
      errorDetails.errorMessage = error.message;
      errorDetails.stackTrace = error.stack;
    } else if (error) {
      errorDetails.errorDetails = String(error);
    }

    writeLog(createLogEntry('ERROR', message, errorDetails));
  },

  critical(message: string, error?: Error | unknown, extra?: Record<string, unknown>): void {
    const errorDetails: Record<string, unknown> = { ...extra };

    if (error instanceof Error) {
      errorDetails.errorName = error.name;
      errorDetails.errorMessage = error.message;
      errorDetails.stackTrace = error.stack;
    } else if (error) {
      errorDetails.errorDetails = String(error);
    }

    writeLog(createLogEntry('CRITICAL', message, errorDetails));
  },

  /**
   * Log an HTTP request/response
   */
  httpRequest(
    req: Request,
    res: Response,
    latencyMs: number,
    extra?: Record<string, unknown>
  ): void {
    const entry = createLogEntry('INFO', `${req.method} ${req.path}`, {
      ...extra,
      httpRequest: {
        requestMethod: req.method,
        requestUrl: req.originalUrl,
        status: res.statusCode,
        userAgent: req.get('user-agent'),
        remoteIp: req.ip || req.socket.remoteAddress,
        latency: `${latencyMs / 1000}s`
      }
    });
    writeLog(entry);
  },

  /**
   * Log a security event (auth failures, IDOR attempts, etc.)
   */
  security(message: string, extra?: Record<string, unknown>): void {
    writeLog(createLogEntry('WARNING', `[SECURITY] ${message}`, {
      ...extra,
      labels: { type: 'security_event' }
    }));
  }
};

/**
 * Express middleware to add request ID and logging
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate or extract request ID
  const requestId = (req.get('x-request-id') || req.get('x-cloud-trace-context')?.split('/')[0] || generateRequestId());

  // Store request ID on request object for access in handlers
  (req as Request & { requestId: string }).requestId = requestId;

  // Set response header for tracing
  res.setHeader('x-request-id', requestId);

  // Set request context for logging
  setRequestContext(requestId);

  // Track request timing
  const startTime = Date.now();

  // Log request start
  logger.info(`Incoming request: ${req.method} ${req.path}`, {
    httpRequest: {
      requestMethod: req.method,
      requestUrl: req.originalUrl,
      userAgent: req.get('user-agent'),
      remoteIp: req.ip || req.socket.remoteAddress
    }
  });

  // Log response when finished
  res.on('finish', () => {
    const latencyMs = Date.now() - startTime;
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    if (userId) {
      setRequestContext(requestId, userId);
    }

    logger.httpRequest(req, res, latencyMs, {
      labels: {
        endpoint: req.path,
        method: req.method
      }
    });

    clearRequestContext();
  });

  next();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}
