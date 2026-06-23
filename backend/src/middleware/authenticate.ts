import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth.js';
import { createError } from './errorHandler.js';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(createError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(createError(403, 'FORBIDDEN', 'Insufficient permissions'));
      return;
    }
    next();
  };
}
