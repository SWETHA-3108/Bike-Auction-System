import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { JwtPayload } from '../types/index.js';

export function verifySocketToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    if (payload.type !== 'access') return null;
    return payload;
  } catch {
    return null;
  }
}
