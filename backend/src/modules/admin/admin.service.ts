import { Motorcycle } from '../../models/Motorcycle.js';
import { Auction } from '../../models/Auction.js';
import { User } from '../../models/User.js';
import { Bid } from '../../models/Bid.js';
import { AuditLog } from '../../models/AuditLog.js';
import { createError } from '../../middleware/errorHandler.js';
import { createAuction, updateAuction, endAuction } from '../auctions/auction.service.js';
import { scheduleAuctionJobs } from '../../jobs/queues.js';

export async function createMotorcycle(input: Record<string, unknown>, sellerId: string) {
  const motorcycle = await Motorcycle.create({
    sellerId,
    title: input.title,
    make: input.make,
    bikeModel: input.model ?? input.bikeModel,
    year: input.year,
    mileage: input.mileage,
    engineCc: input.engineCc,
    color: input.color,
    condition: input.condition,
    description: input.description,
    images: input.images ?? [],
    vin: input.vin,
    location: input.location,
    status: 'draft',
  });
  return formatMotorcycle(motorcycle);
}

export async function createAdminAuction(
  input: Record<string, unknown>,
  sellerId: string,
  actorId: string,
  ip?: string
) {
  const auction = await createAuction({
    motorcycleId: input.motorcycleId as string,
    sellerId,
    title: input.title as string,
    description: input.description as string | undefined,
    startTime: input.startTime as string,
    endTime: input.endTime as string,
    startingPrice: input.startingPrice as number,
    minIncrement: (input.minIncrement as number) ?? 100,
    reservePrice: input.reservePrice as number | undefined,
    buyNowPrice: input.buyNowPrice as number | undefined,
    softCloseExtensionSec: (input.softCloseExtensionSec as number) ?? 120,
    extensionThresholdSec: (input.extensionThresholdSec as number) ?? 60,
    maxExtensions: input.maxExtensions as number | undefined,
  });

  if (input.schedule === true) {
    const doc = await Auction.findById(auction.id);
    if (doc) {
      doc.status = 'scheduled';
      await doc.save();
      await scheduleAuctionJobs(doc);
    }
  }

  await logAudit(actorId, 'auction.create', 'auction', auction.id, input, ip);
  return auction;
}

export async function adminUpdateAuction(
  id: string,
  updates: Record<string, unknown>,
  actorId: string,
  ip?: string
) {
  const auction = await updateAuction(id, updates);
  if (updates.status === 'scheduled') {
    const doc = await Auction.findById(id);
    if (doc) await scheduleAuctionJobs(doc);
  }
  await logAudit(actorId, 'auction.update', 'auction', id, updates, ip);
  return auction;
}

export async function forceEndAuction(id: string, actorId: string, ip?: string) {
  const auction = await Auction.findById(id);
  if (!auction) throw createError(404, 'NOT_FOUND', 'Auction not found');
  const ended = await endAuction(auction, true);
  await logAudit(actorId, 'auction.force_end', 'auction', id, {}, ip);
  return {
    id: ended._id.toString(),
    status: ended.status,
    winnerId: ended.winnerId?.toString(),
    currentPrice: ended.currentPrice,
  };
}

export async function cancelAuction(id: string, actorId: string, ip?: string) {
  const result = await updateAuction(id, { status: 'cancelled' });
  await logAudit(actorId, 'auction.cancel', 'auction', id, {}, ip);
  return result;
}

export async function listUsers(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-passwordHash -refreshTokenHash')
      .lean(),
    User.countDocuments(),
  ]);
  return {
    data: users.map((u) => ({
      id: String(u._id),
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
    })),
    meta: { page, limit, total, hasMore: skip + users.length < total },
  };
}

export async function updateUser(
  id: string,
  updates: Record<string, unknown>,
  actorId: string,
  ip?: string
) {
  const user = await User.findById(id);
  if (!user) throw createError(404, 'NOT_FOUND', 'User not found');
  if (updates.isActive !== undefined) user.isActive = updates.isActive as boolean;
  if (updates.role) user.role = updates.role as 'bidder' | 'admin';
  await user.save();
  await logAudit(actorId, 'user.update', 'user', id, updates, ip);
  return {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
  };
}

export async function getDashboardStats() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [liveCount, scheduledCount, bidsToday, totalUsers, recentAuctions] = await Promise.all([
    Auction.countDocuments({ status: 'live' }),
    Auction.countDocuments({ status: 'scheduled' }),
    Bid.countDocuments({ createdAt: { $gte: startOfDay }, status: { $ne: 'rejected' } }),
    User.countDocuments(),
    Auction.find().sort({ createdAt: -1 }).limit(5).populate('motorcycleId').lean(),
  ]);

  return {
    liveCount,
    scheduledCount,
    bidsToday,
    totalUsers,
    recentAuctions: recentAuctions.map((a) => ({
      id: String(a._id),
      title: a.title,
      status: a.status,
      currentPrice: a.currentPrice,
    })),
  };
}

export async function listAuditLogs(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AuditLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actorId', 'email fullName')
      .lean(),
    AuditLog.countDocuments(),
  ]);
  return {
    data: logs.map((l) => ({
      id: String(l._id),
      actor: l.actorId,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      metadata: l.metadata,
      ip: l.ip,
      createdAt: l.createdAt,
    })),
    meta: { page, limit, total, hasMore: skip + logs.length < total },
  };
}

async function logAudit(
  actorId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata: Record<string, unknown>,
  ip?: string
) {
  await AuditLog.create({
    actorId,
    action,
    resourceType,
    resourceId,
    metadata,
    ip,
  });
}

function formatMotorcycle(m: {
  _id: { toString: () => string };
  title: string;
  make: string;
  bikeModel: string;
  year: number;
  mileage: number;
  engineCc: number;
  color: string;
  condition: string;
  description: string;
  images: string[];
  location: { city: string; state: string };
  status: string;
}) {
  return {
    id: m._id.toString(),
    title: m.title,
    make: m.make,
    model: m.bikeModel,
    year: m.year,
    mileage: m.mileage,
    engineCc: m.engineCc,
    color: m.color,
    condition: m.condition,
    description: m.description,
    images: m.images,
    location: m.location,
    status: m.status,
  };
}

export { formatMotorcycle };
