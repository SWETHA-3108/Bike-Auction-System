import { Queue } from 'bullmq';
import { bullmqConnection } from '../config/bullmq.js';

export const auctionLifecycleQueue = new Queue('auction-lifecycle', {
  connection: bullmqConnection,
});
export const notificationQueue = new Queue('notifications', {
  connection: bullmqConnection,
});

export async function enqueueAuctionStart(auctionId: string, delayMs: number) {
  await auctionLifecycleQueue.add(
    'start',
    { auctionId },
    { jobId: `start-${auctionId}`, delay: delayMs, removeOnComplete: true }
  );
}

export async function enqueueAuctionEnd(auctionId: string, delayMs: number) {
  await auctionLifecycleQueue.add(
    'end',
    { auctionId },
    { jobId: `end-${auctionId}`, delay: delayMs, removeOnComplete: true }
  );
}

export async function enqueueNotification(data: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  await notificationQueue.add('send', data, { removeOnComplete: true });
}

export async function scheduleAuctionJobs(auction: {
  _id: { toString: () => string };
  startTime: Date;
  endTime: Date;
  status: string;
}) {
  const now = Date.now();
  const startDelay = Math.max(0, auction.startTime.getTime() - now);
  const endDelay = Math.max(0, auction.endTime.getTime() - now);

  if (auction.status === 'scheduled') {
    await enqueueAuctionStart(auction._id.toString(), startDelay);
    await enqueueAuctionEnd(auction._id.toString(), endDelay);
  }
}

export async function scheduleAuctionEndOnly(auction: {
  _id: { toString: () => string };
  endTime: Date;
}) {
  const endDelay = Math.max(0, auction.endTime.getTime() - Date.now());
  await enqueueAuctionEnd(auction._id.toString(), endDelay);
}
