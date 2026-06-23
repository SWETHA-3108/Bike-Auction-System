import { Request, Response, NextFunction } from 'express';
import { getRedis } from '../config/redis.js';
import { createError } from './errorHandler.js';

export async function globalRateLimiter(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (req.path.startsWith('/health') || req.path === '/metrics') {
    next();
    return;
  }

  const ip = req.ip ?? 'unknown';
  const key = `rate:global:${ip}`;
  const redis = getRedis();
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60);
  }
  if (count > 100) {
    next(createError(429, 'RATE_LIMITED', 'Too many requests'));
    return;
  }
  next();
}

export async function bidRateLimiter(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }

  const key = `rate:bid:${req.user.id}`;
  const redis = getRedis();
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 1);
  }
  if (count > 3) {
    next(createError(429, 'RATE_LIMITED', 'Too many bids. Please wait.'));
    return;
  }
  next();
}
