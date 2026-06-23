import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service.js';
import { env } from '../../config/env.js';

const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: '/v1/auth',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie('refreshToken', { path: '/v1/auth' });
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.loginUser(req.body.email, req.body.password);
    setRefreshCookie(res, result.refreshToken);
    res.json({
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.body.refreshToken ?? req.cookies?.refreshToken;
    if (!token) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Refresh token required' },
      });
      return;
    }
    const tokens = await authService.refreshAccessToken(token);
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ data: tokens });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.logoutUser(req.user!.id);
    clearRefreshCookie(res);
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getUserById(req.user!.id);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}
