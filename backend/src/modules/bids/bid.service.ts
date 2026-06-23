import { Bid } from '../../models/Bid.js';
import { Auction } from '../../models/Auction.js';
import { createError } from '../../middleware/errorHandler.js';
import {
  acceptBidAtomic,
  getIdempotencyResponse,
  setIdempotencyResponse,
  invalidateAuctionCache,
} from '../../redis/auctionState.js';
import { bidsAcceptedTotal, bidsRejectedTotal } from '../../utils/metrics.js';
import { enqueueNotification } from '../../jobs/queues.js';
import { getSocketEmitter } from '../../socket/emitters.js';
import { maskHighBidderId } from '../../socket/relayBridge.js';
import { endAuction } from '../auctions/auction.service.js';

export async function placeBid(params: {
  auctionId: string;
  userId: string;
  amount: number;
  clientIp?: string;
  userAgent?: string;
  idempotencyKey?: string;
}) {
  if (params.idempotencyKey) {
    const cached = await getIdempotencyResponse(params.idempotencyKey);
    if (cached) return JSON.parse(cached);
  }

  const auction = await Auction.findById(params.auctionId);
  if (!auction) throw createError(404, 'NOT_FOUND', 'Auction not found');
  if (auction.status !== 'live') {
    throw createError(400, 'AUCTION_NOT_LIVE', 'Auction is not live');
  }
  if (auction.sellerId.toString() === params.userId) {
    throw createError(400, 'SELF_BID_NOT_ALLOWED', 'Seller cannot bid on own auction');
  }

  const result = await acceptBidAtomic(params.auctionId, {
    amount: params.amount,
    minIncrement: auction.minIncrement,
    userId: params.userId,
    extensionThresholdSec: auction.extensionThresholdSec,
    softCloseExtensionSec: auction.softCloseExtensionSec,
    maxExtensions: auction.maxExtensions,
    buyNowPrice: auction.buyNowPrice,
  });

  if (!result.ok) {
    bidsRejectedTotal.inc({ reason: result.code ?? 'UNKNOWN' });
    throw createError(400, result.code ?? 'BID_REJECTED', result.message ?? 'Bid rejected', result.details);
  }

  bidsAcceptedTotal.inc();

  const previousHighBidder = auction.winnerId?.toString();
  auction.currentPrice = result.amount!;
  auction.bidCount = result.bidCount!;
  auction.extensionCount = result.extensionCount!;
  auction.endTime = new Date(result.endTime!);
  if (result.highBidderId) {
    auction.winnerId = result.highBidderId as unknown as typeof auction.winnerId;
  }
  await auction.save();

  const bid = await Bid.create({
    auctionId: params.auctionId,
    userId: params.userId,
    amount: result.amount!,
    bidSequence: result.bidSequence!,
    status: 'accepted',
    clientIp: params.clientIp,
    userAgent: params.userAgent,
  });

  if (previousHighBidder && previousHighBidder !== params.userId) {
    await Bid.updateMany(
      { auctionId: params.auctionId, userId: previousHighBidder, status: 'accepted' },
      { status: 'outbid' }
    );
    await enqueueNotification({
      userId: previousHighBidder,
      type: 'bid_outbid',
      title: 'You have been outbid',
      body: `Someone placed a higher bid on ${auction.title}`,
      data: { auctionId: params.auctionId, amount: result.amount },
    });
  }

  await invalidateAuctionCache(params.auctionId);

  const response = {
    bid: {
      id: bid._id.toString(),
      amount: bid.amount,
      bidSequence: bid.bidSequence,
      createdAt: bid.createdAt,
    },
    auction: {
      currentPrice: result.amount,
      bidCount: result.bidCount,
      endTime: new Date(result.endTime!),
      status: auction.status as string,
      extensionCount: result.extensionCount,
    },
  };

  const emitter = getSocketEmitter();
  if (emitter) {
    emitter.to(`auction:${params.auctionId}`).emit('bid:update', {
      auctionId: params.auctionId,
      amount: result.amount,
      bidCount: result.bidCount,
      highBidderId: maskHighBidderId(result.highBidderId),
      timestamp: new Date().toISOString(),
    });

    if (result.extended) {
      emitter.to(`auction:${params.auctionId}`).emit('auction:extended', {
        auctionId: params.auctionId,
        newEndTime: new Date(result.endTime!).toISOString(),
      });
      await enqueueNotification({
        userId: params.userId,
        type: 'auction_extended',
        title: 'Auction extended',
        body: `${auction.title} was extended due to a late bid`,
        data: { auctionId: params.auctionId, newEndTime: result.endTime },
      });
    }
  }

  if (result.buyNow) {
    await endAuction(auction, true);
    if (emitter) {
      emitter.to(`auction:${params.auctionId}`).emit('auction:ended', {
        auctionId: params.auctionId,
        winnerId: params.userId,
        winningAmount: result.amount,
      });
    }
    response.auction.status = 'ended';
  }

  if (params.idempotencyKey) {
    await setIdempotencyResponse(params.idempotencyKey, JSON.stringify(response));
  }

  return response;
}
