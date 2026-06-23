import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(100),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const placeBidSchema = z.object({
  amount: z.number().int().positive(),
});

export const auctionListQuerySchema = z.object({
  status: z.enum(['draft', 'scheduled', 'live', 'ended', 'cancelled']).optional(),
  make: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  unread: z.coerce.boolean().optional(),
});

export const createMotorcycleSchema = z.object({
  title: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  mileage: z.number().int().min(0),
  engineCc: z.number().int().min(0),
  color: z.string().min(1),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']),
  description: z.string().min(1),
  images: z.array(z.string().url()).default([]),
  vin: z.string().optional(),
  location: z.object({ city: z.string(), state: z.string() }),
});

export const createAuctionSchema = z.object({
  motorcycleId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  startingPrice: z.number().int().positive(),
  minIncrement: z.number().int().positive().default(100),
  reservePrice: z.number().int().positive().optional(),
  buyNowPrice: z.number().int().positive().optional(),
  softCloseExtensionSec: z.number().int().positive().default(120),
  extensionThresholdSec: z.number().int().positive().default(60),
  maxExtensions: z.number().int().positive().optional(),
  schedule: z.boolean().optional(),
});

export const updateAuctionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  status: z.enum(['draft', 'scheduled', 'cancelled']).optional(),
  minIncrement: z.number().int().positive().optional(),
  reservePrice: z.number().int().positive().optional(),
  buyNowPrice: z.number().int().positive().optional(),
});

export const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['bidder', 'admin']).optional(),
});
