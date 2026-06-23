import { Worker } from 'bullmq';
import { bullmqConnection } from '../config/bullmq.js';
import { connectMongo } from '../config/database.js';
import { connectRedis } from '../config/redis.js';
import { Auction } from '../models/Auction.js';
import { startAuction, endAuction } from '../modules/auctions/auction.service.js';
import { Notification } from '../models/Notification.js';
import { getSocketEmitter } from '../socket/emitters.js';
import { emitToRoom } from '../socket/relayBridge.js';
import { reschedulePendingAuctions } from './scheduler.js';
import { logger } from '../utils/logger.js';

async function processAuctionLifecycle(job: { name: string; data: { auctionId: string } }) {
  const auction = await Auction.findById(job.data.auctionId);
  if (!auction) return;

  if (job.name === 'start' && auction.status === 'scheduled') {
    await startAuction(auction);
    logger.info('Auction started', { auctionId: job.data.auctionId });
    await emitToRoom('auctions:live', 'auction:started', { auctionId: job.data.auctionId });
    await emitToRoom('admin:auctions', 'admin:auction:stats', {
      event: 'started',
      auctionId: job.data.auctionId,
    });
  }

  if (job.name === 'end' && auction.status === 'live') {
    await endAuction(auction);
    logger.info('Auction ended', { auctionId: job.data.auctionId });
    await emitToRoom(`auction:${job.data.auctionId}`, 'auction:ended', {
      auctionId: job.data.auctionId,
      winnerId: auction.winnerId?.toString(),
      winningAmount: auction.currentPrice,
    });
    await emitToRoom('auctions:live', 'auction:ended', { auctionId: job.data.auctionId });
    await emitToRoom('admin:auctions', 'admin:auction:stats', {
      event: 'ended',
      auctionId: job.data.auctionId,
    });
  }
}

async function processNotification(job: {
  data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  };
}) {
  const notification = await Notification.create({
    userId: job.data.userId,
    type: job.data.type,
    title: job.data.title,
    body: job.data.body,
    data: job.data.data ?? {},
    channel: 'in_app',
    status: 'sent',
  });

  const payload = {
    userId: job.data.userId,
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    createdAt: notification.createdAt,
  };

  const emitter = getSocketEmitter();
  if (emitter) {
    emitter.to(`user:${job.data.userId}`).emit('notification:new', payload);
  } else {
    const { publishNotificationEvent } = await import('../socket/notificationBridge.js');
    await publishNotificationEvent(payload);
  }
}

export async function startWorkers() {
  await connectMongo();
  await connectRedis();
  await reschedulePendingAuctions();

  const lifecycleWorker = new Worker('auction-lifecycle', processAuctionLifecycle, {
    connection: bullmqConnection,
  });
  const notificationWorker = new Worker('notifications', processNotification, {
    connection: bullmqConnection,
  });

  lifecycleWorker.on('failed', (job, err) => {
    logger.error('Lifecycle job failed', { jobId: job?.id, error: err.message });
  });
  notificationWorker.on('failed', (job, err) => {
    logger.error('Notification job failed', { jobId: job?.id, error: err.message });
  });

  logger.info('Workers started');
  return { lifecycleWorker, notificationWorker };
}
