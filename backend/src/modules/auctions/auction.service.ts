import { Types } from 'mongoose';
import { Auction, IAuction } from '../../models/Auction.js';
import { Motorcycle } from '../../models/Motorcycle.js';
import { Bid } from '../../models/Bid.js';
import { createError } from '../../middleware/errorHandler.js';
import {
  initAuctionState,
  getAuctionState,
  deleteAuctionState,
  invalidateAuctionCache,
  CACHE_LIVE_AUCTIONS,
  CACHE_AUCTION_PREFIX,
} from '../../redis/auctionState.js';
import { getRedis } from '../../config/redis.js';
import { enqueueNotification } from '../../jobs/queues.js';

export async function listAuctions(query: {
  status?: string;
  make?: string;
  page: number;
  limit: number;
}) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

  if (query.make) {
    const bikes = await Motorcycle.find({ make: new RegExp(query.make, 'i') }).select('_id');
    const motorcycleIds = bikes.map((b) => b._id);
    filter.motorcycleId = { $in: motorcycleIds };
  }

  const skip = (query.page - 1) * query.limit;
  const [auctions, total] = await Promise.all([
    Auction.find(filter)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('motorcycleId')
      .lean(),
    Auction.countDocuments(filter),
  ]);

  return {
    data: auctions.map((a) => formatAuction(a as Record<string, unknown>)),
    meta: { page: query.page, limit: query.limit, total, hasMore: skip + auctions.length < total },
  };
}

export async function listLiveAuctions() {
  const redis = getRedis();
  const cached = await redis.get(CACHE_LIVE_AUCTIONS);
  if (cached) return JSON.parse(cached);

  const result = await listAuctions({ status: 'live', page: 1, limit: 50 });
  await redis.set(CACHE_LIVE_AUCTIONS, JSON.stringify(result), 'EX', 10);
  return result;
}

export async function getAuctionById(id: string) {
  const redis = getRedis();
  const cacheKey = `${CACHE_AUCTION_PREFIX}${id}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const auction = await Auction.findById(id).populate('motorcycleId').lean();
  if (!auction) throw createError(404, 'NOT_FOUND', 'Auction not found');

  const liveState = await getAuctionState(id);
  const formatted = {
    ...formatAuction(auction as Record<string, unknown>),
    liveState,
  };
  await redis.set(cacheKey, JSON.stringify(formatted), 'EX', 5);
  return formatted;
}

export async function getAuctionBids(auctionId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [bids, total] = await Promise.all([
    Bid.find({ auctionId, status: { $ne: 'rejected' } })
      .sort({ bidSequence: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'fullName')
      .lean(),
    Bid.countDocuments({ auctionId, status: { $ne: 'rejected' } }),
  ]);

  return {
    data: bids.map((b) => ({
      id: String(b._id),
      amount: b.amount,
      bidSequence: b.bidSequence,
      status: b.status,
      bidderName: maskBidder(
        typeof b.userId === 'object' && b.userId && 'fullName' in b.userId
          ? (b.userId as { fullName?: string }).fullName
          : undefined
      ),
      createdAt: b.createdAt,
    })),
    meta: { page, limit, total, hasMore: skip + bids.length < total },
  };
}

export async function createAuction(input: {
  motorcycleId: string;
  sellerId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  startingPrice: number;
  minIncrement: number;
  reservePrice?: number;
  buyNowPrice?: number;
  softCloseExtensionSec: number;
  extensionThresholdSec: number;
  maxExtensions?: number;
}) {
  const motorcycle = await Motorcycle.findById(input.motorcycleId);
  if (!motorcycle) throw createError(404, 'NOT_FOUND', 'Motorcycle not found');

  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  if (endTime <= startTime) {
    throw createError(400, 'VALIDATION_ERROR', 'End time must be after start time');
  }

  const auction = await Auction.create({
    motorcycleId: input.motorcycleId,
    sellerId: input.sellerId,
    title: input.title,
    description: input.description,
    status: 'draft',
    startTime,
    endTime,
    originalEndTime: endTime,
    startingPrice: input.startingPrice,
    currentPrice: input.startingPrice,
    minIncrement: input.minIncrement,
    reservePrice: input.reservePrice,
    buyNowPrice: input.buyNowPrice,
    softCloseExtensionSec: input.softCloseExtensionSec,
    extensionThresholdSec: input.extensionThresholdSec,
    maxExtensions: input.maxExtensions,
  });

  motorcycle.status = 'listed';
  await motorcycle.save();

  return formatAuction(await auction.populate('motorcycleId'));
}

export async function updateAuction(id: string, updates: Record<string, unknown>) {
  const auction = await Auction.findById(id);
  if (!auction) throw createError(404, 'NOT_FOUND', 'Auction not found');

  if (auction.status === 'live' || auction.status === 'ended') {
    const allowed = ['title', 'description'];
    const keys = Object.keys(updates);
    if (keys.some((k) => !allowed.includes(k))) {
      throw createError(400, 'INVALID_STATE', 'Cannot update pricing or schedule on live/ended auction');
    }
  }

  if (updates.startTime) auction.startTime = new Date(updates.startTime as string);
  if (updates.endTime) {
    auction.endTime = new Date(updates.endTime as string);
    if (auction.status === 'draft' || auction.status === 'scheduled') {
      auction.originalEndTime = auction.endTime;
    }
  }
  if (updates.title) auction.title = updates.title as string;
  if (updates.description !== undefined) auction.description = updates.description as string;
  if (updates.minIncrement) auction.minIncrement = updates.minIncrement as number;
  if (updates.reservePrice !== undefined) auction.reservePrice = updates.reservePrice as number;
  if (updates.buyNowPrice !== undefined) auction.buyNowPrice = updates.buyNowPrice as number;
  if (updates.status === 'scheduled' && auction.status === 'draft') {
    auction.status = 'scheduled';
  }
  if (updates.status === 'cancelled' && ['draft', 'scheduled'].includes(auction.status)) {
    auction.status = 'cancelled';
  }

  await auction.save();
  await invalidateAuctionCache(id);
  return formatAuction(await auction.populate('motorcycleId'));
}

export async function startAuction(auction: IAuction): Promise<IAuction> {
  auction.status = 'live';
  auction.startedAt = new Date();
  auction.currentPrice = auction.startingPrice;
  await auction.save();

  await initAuctionState(auction._id.toString(), {
    currentPrice: auction.startingPrice,
    highBidderId: null,
    bidCount: 0,
    endTime: auction.endTime.toISOString(),
    status: 'live',
    extensionCount: 0,
  });

  await invalidateAuctionCache(auction._id.toString());

  const { Watchlist } = await import('../../models/Watchlist.js');
  const watchers = await Watchlist.find({ auctionId: auction._id }).select('userId');
  for (const w of watchers) {
    await enqueueNotification({
      userId: w.userId.toString(),
      type: 'auction_starting',
      title: 'Auction is live!',
      body: `${auction.title} is now live. Place your bids!`,
      data: { auctionId: auction._id.toString() },
    });
  }

  return auction;
}

export async function endAuction(auction: IAuction, force = false): Promise<IAuction> {
  if (auction.status !== 'live' && !force) return auction;

  const liveState = await getAuctionState(auction._id.toString());
  if (liveState) {
    auction.currentPrice = liveState.currentPrice;
    auction.bidCount = liveState.bidCount;
    auction.extensionCount = liveState.extensionCount;
    auction.endTime = new Date(
      /^\d+$/.test(liveState.endTime) ? Number(liveState.endTime) : liveState.endTime
    );
    if (liveState.highBidderId) {
      auction.winnerId = new Types.ObjectId(liveState.highBidderId);
      const winningBid = await Bid.findOne({
        auctionId: auction._id,
        userId: liveState.highBidderId,
        status: { $in: ['accepted', 'winning'] },
      }).sort({ bidSequence: -1 });
      if (winningBid) {
        auction.winningBidId = winningBid._id;
        winningBid.status = 'winning';
        await winningBid.save();
      }
    }
  }

  auction.status = 'ended';
  auction.endedAt = new Date();
  await auction.save();

  await deleteAuctionState(auction._id.toString());
  await invalidateAuctionCache(auction._id.toString());

  const motorcycle = await Motorcycle.findById(auction.motorcycleId);
  if (motorcycle && auction.winnerId) motorcycle.status = 'sold';
  if (motorcycle) await motorcycle.save();

  const notifyUsers = new Set<string>();
  if (auction.winnerId) notifyUsers.add(auction.winnerId.toString());
  const bidders = await Bid.distinct('userId', { auctionId: auction._id });
  bidders.forEach((id: Types.ObjectId) => notifyUsers.add(id.toString()));

  for (const userId of notifyUsers) {
    const isWinner = userId === auction.winnerId?.toString();
    await enqueueNotification({
      userId,
      type: 'auction_ended',
      title: isWinner ? 'You won!' : 'Auction ended',
      body: isWinner
        ? `You won ${auction.title} at $${(auction.currentPrice / 100).toFixed(2)}`
        : `${auction.title} has ended.`,
      data: {
        auctionId: auction._id.toString(),
        winnerId: auction.winnerId?.toString(),
        winningAmount: auction.currentPrice,
      },
    });
  }

  return auction;
}

function formatAuction(auction: Record<string, unknown>) {
  const motorcycle = auction.motorcycleId as Record<string, unknown> | undefined;
  return {
    id: (auction._id as { toString: () => string }).toString(),
    motorcycleId: motorcycle
      ? (motorcycle._id as { toString: () => string }).toString()
      : (auction.motorcycleId as { toString: () => string })?.toString(),
    motorcycle: motorcycle
      ? {
          id: (motorcycle._id as { toString: () => string }).toString(),
          title: motorcycle.title,
          make: motorcycle.make,
          model: motorcycle.bikeModel,
          year: motorcycle.year,
          mileage: motorcycle.mileage,
          engineCc: motorcycle.engineCc,
          color: motorcycle.color,
          condition: motorcycle.condition,
          description: motorcycle.description,
          images: motorcycle.images,
          location: motorcycle.location,
        }
      : undefined,
    sellerId: (auction.sellerId as { toString: () => string })?.toString(),
    title: auction.title,
    description: auction.description,
    status: auction.status,
    startTime: auction.startTime,
    endTime: auction.endTime,
    originalEndTime: auction.originalEndTime,
    startingPrice: auction.startingPrice,
    currentPrice: auction.currentPrice,
    minIncrement: auction.minIncrement,
    buyNowPrice: auction.buyNowPrice,
    winnerId: (auction.winnerId as { toString: () => string } | undefined)?.toString(),
    bidCount: auction.bidCount,
    watcherCount: auction.watcherCount,
    softCloseExtensionSec: auction.softCloseExtensionSec,
    extensionThresholdSec: auction.extensionThresholdSec,
    maxExtensions: auction.maxExtensions,
    extensionCount: auction.extensionCount,
    startedAt: auction.startedAt,
    endedAt: auction.endedAt,
    createdAt: auction.createdAt,
  };
}

function maskBidder(name?: string): string {
  if (!name) return 'Bidder';
  if (name.length <= 2) return 'Bidder ***';
  return `Bidder ${name.slice(0, 1)}***${name.slice(-1)}`;
}

export { maskBidder };
