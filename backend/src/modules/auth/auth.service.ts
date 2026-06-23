import { User } from '../../models/User.js';
import {
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  compareTokenHash,
} from '../../utils/auth.js';
import { AppError, createError } from '../../middleware/errorHandler.js';
import { UserRole } from '../../types/index.js';

export async function registerUser(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw createError(409, 'EMAIL_EXISTS', 'Email already registered');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    email: input.email.toLowerCase(),
    passwordHash,
    fullName: input.fullName,
    phone: input.phone,
    role: 'bidder',
  });

  return sanitizeUser(user);
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.isActive) {
    throw createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  user.lastLoginAt = new Date();
  const tokens = generateTokens(user);
  user.refreshTokenHash = await hashToken(tokens.refreshToken);
  await user.save();

  return { user: sanitizeUser(user), ...tokens };
}

export async function refreshAccessToken(refreshToken: string) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw createError(401, 'INVALID_TOKEN', 'Invalid refresh token');
    }

    const valid = await compareTokenHash(refreshToken, user.refreshTokenHash);
    if (!valid) {
      throw createError(401, 'INVALID_TOKEN', 'Invalid refresh token');
    }

    const tokens = generateTokens(user);
    user.refreshTokenHash = await hashToken(tokens.refreshToken);
    await user.save();

    return tokens;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw createError(401, 'INVALID_TOKEN', 'Invalid refresh token');
  }
}

export async function logoutUser(userId: string) {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
}

export async function getUserById(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw createError(404, 'NOT_FOUND', 'User not found');
  return sanitizeUser(user);
}

function generateTokens(user: { _id: { toString: () => string }; email: string; role: string }) {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role as UserRole,
  };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

function sanitizeUser(user: {
  _id: { toString: () => string };
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    isEmailVerified: user.isEmailVerified,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}
