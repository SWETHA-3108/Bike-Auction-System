import { Types } from 'mongoose';
import { Watchlist } from '../../models/Watchlist.js';
import { Auction } from '../../models/Auction.js';
import { createError } from '../../middleware/errorHandler.js';

function formatWatchlistAuction(auction: Record<string, unknown> | null) {
  if (!auction || typeof auction !== 'object' || !('_id' in auction)) return undefined;

  const motorcycle = auction.motorcycleId as Record<string, unknown> | undefined;
  return {
    id: (auction._id as { toString: () => string }).toString(),
    title: auction.title,
    status: auction.status,
    currentPrice: auction.currentPrice,
    endTime: auction.endTime,
    motorcycle: motorcycle
      ? {
          make: motorcycle.make,
          model: motorcycle.bikeModel,
          year: motorcycle.year,
          images: motorcycle.images,
        }
      : undefined,
  };
}

export async function getUserWatchlist(userId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Watchlist.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'auctionId', populate: { path: 'motorcycleId' } })
      .lean(),
    Watchlist.countDocuments({ userId }),
  ]);

  return {
    data: items.map((item) => {
      const auction = item.auctionId as Record<string, unknown> | Types.ObjectId;
      const auctionId =
        typeof auction === 'object' && auction && '_id' in auction
          ? (auction._id as Types.ObjectId).toString()
          : String(auction);

      return {
        id: String(item._id),
        auctionId,
        auction: formatWatchlistAuction(
          typeof auction === 'object' && auction && '_id' in auction
            ? (auction as Record<string, unknown>)
            : null
        ),
        createdAt: item.createdAt,
      };
    }),
    meta: { page, limit, total, hasMore: skip + items.length < total },
  };
}

export async function addToWatchlist(userId: string, auctionId: string) {
  const auction = await Auction.findById(auctionId);
  if (!auction) throw createError(404, 'NOT_FOUND', 'Auction not found');

  const existing = await Watchlist.findOne({ userId, auctionId });
  if (existing) {
    return { id: existing._id.toString(), auctionId, createdAt: existing.createdAt };
  }

  const item = await Watchlist.create({ userId, auctionId });
  await Auction.findByIdAndUpdate(auctionId, { $inc: { watcherCount: 1 } });
  return { id: item._id.toString(), auctionId, createdAt: item.createdAt };
}

export async function removeFromWatchlist(userId: string, auctionId: string) {
  const result = await Watchlist.findOneAndDelete({ userId, auctionId });
  if (result) {
    await Auction.findByIdAndUpdate(auctionId, { $inc: { watcherCount: -1 } });
  }
  return { success: true };
}

export async function isWatched(userId: string, auctionId: string): Promise<boolean> {
  const item = await Watchlist.findOne({ userId, auctionId });
  return !!item;
}
