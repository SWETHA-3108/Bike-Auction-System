import { Auction } from '../models/Auction.js';
import { scheduleAuctionJobs, scheduleAuctionEndOnly } from './queues.js';
import { logger } from '../utils/logger.js';

export async function reschedulePendingAuctions(): Promise<void> {
  const scheduled = await Auction.find({ status: 'scheduled' });
  for (const auction of scheduled) {
    await scheduleAuctionJobs(auction);
    logger.info('Rescheduled auction lifecycle jobs', { auctionId: auction._id.toString() });
  }

  const live = await Auction.find({ status: 'live' });
  for (const auction of live) {
    await scheduleAuctionEndOnly(auction);
    logger.info('Rescheduled auction end job', { auctionId: auction._id.toString() });
  }

  logger.info('Auction scheduler sync complete', {
    scheduled: scheduled.length,
    live: live.length,
  });
}
