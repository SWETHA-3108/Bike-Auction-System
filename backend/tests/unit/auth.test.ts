import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, signAccessToken, verifyAccessToken } from '../../src/utils/auth.js';

describe('auth utils', () => {
  it('hashes and compares passwords', async () => {
    const hash = await hashPassword('TestPassword123!');
    expect(hash).not.toBe('TestPassword123!');
    expect(await comparePassword('TestPassword123!', hash)).toBe(true);
    expect(await comparePassword('wrong', hash)).toBe(false);
  });

  it('signs and verifies access tokens', () => {
    const token = signAccessToken({
      sub: 'user123',
      email: 'test@example.com',
      role: 'bidder',
    });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user123');
    expect(payload.email).toBe('test@example.com');
    expect(payload.type).toBe('access');
  });
});
