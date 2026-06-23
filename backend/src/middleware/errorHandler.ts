import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function createError(
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): AppError {
  return new AppError(statusCode, code, message, details);
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn('Request error', {
      requestId: req.requestId,
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
    });
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  logger.error('Unhandled error', {
    requestId: req.requestId,
    error: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
