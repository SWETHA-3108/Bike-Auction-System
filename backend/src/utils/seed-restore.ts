import { connectMongo, disconnectMongo } from '../config/database.js';
import { connectRedis, disconnectRedis, getRedis } from '../config/redis.js';
import { User } from '../models/User.js';
import { Motorcycle } from '../models/Motorcycle.js';
import { Auction } from '../models/Auction.js';
import { Bid } from '../models/Bid.js';
import { Watchlist } from '../models/Watchlist.js';
import { Notification } from '../models/Notification.js';
import { hashPassword } from './auth.js';
import { logger } from './logger.js';
import { initAuctionState } from '../redis/auctionState.js';
import { scheduleAuctionJobs } from '../jobs/queues.js';

const DEMO_IMAGE =
  'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800';

/**
 * Removes auction catalog data (including E2E/test fixtures) and re-seeds demo
 * motorcycles with images. Preserves user accounts.
 */
export async function restoreDemoData() {
  await connectMongo();
  await connectRedis();

  try {
    logger.info('Restoring demo auction data...');

    await Bid.deleteMany({});
    await Watchlist.deleteMany({});
    await Notification.deleteMany({});
    await Auction.deleteMany({});
    await Motorcycle.deleteMany({});

    const redis = getRedis();
    try {
      await redis.flushdb();
    } catch {
      const patterns = ['auction:*', 'idempotency:*', 'rate:*', 'cache:*'];
      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) await redis.del(...keys);
      }
    }

    let admin = await User.findOne({ email: 'admin@bikeauction.com' });
    if (!admin) {
      admin = await User.create({
        email: 'admin@bikeauction.com',
        passwordHash: await hashPassword('Admin123!'),
        fullName: 'Platform Admin',
        role: 'admin',
        isEmailVerified: true,
      });
    }

    let bidder = await User.findOne({ email: 'bidder@example.com' });
    if (!bidder) {
      bidder = await User.create({
        email: 'bidder@example.com',
        passwordHash: await hashPassword('Bidder123!'),
        fullName: 'Demo Bidder',
        role: 'bidder',
        isEmailVerified: true,
      });
    }

    const motorcycle = await Motorcycle.create({
      sellerId: admin._id,
      title: '2020 Harley-Davidson Street Glide',
      make: 'Harley-Davidson',
      bikeModel: 'Street Glide',
      year: 2020,
      mileage: 12500,
      engineCc: 1745,
      color: 'Black',
      condition: 'excellent',
      description: 'Well maintained touring bike with premium audio and low mileage.',
      images: [DEMO_IMAGE],
      location: { city: 'Austin', state: 'TX' },
      status: 'listed',
    });

    const now = Date.now();
    const liveAuction = await Auction.create({
      motorcycleId: motorcycle._id,
      sellerId: admin._id,
      title: 'Live: Harley Street Glide',
      status: 'live',
      startTime: new Date(now - 3_600_000),
      endTime: new Date(now + 7_200_000),
      originalEndTime: new Date(now + 7_200_000),
      startingPrice: 1_200_000,
      currentPrice: 1_200_000,
      minIncrement: 25_000,
      bidCount: 0,
      startedAt: new Date(now - 3_600_000),
    });

    await initAuctionState(liveAuction._id.toString(), {
      currentPrice: liveAuction.startingPrice,
      highBidderId: null,
      bidCount: 0,
      endTime: liveAuction.endTime.getTime().toString(),
      status: 'live',
      extensionCount: 0,
    });

    const scheduledAuction = await Auction.create({
      motorcycleId: motorcycle._id,
      sellerId: admin._id,
      title: 'Upcoming: Harley Street Glide #2',
      status: 'scheduled',
      startTime: new Date(now + 86_400_000),
      endTime: new Date(now + 90_000_000),
      originalEndTime: new Date(now + 90_000_000),
      startingPrice: 1_100_000,
      currentPrice: 1_100_000,
      minIncrement: 20_000,
    });
    await scheduleAuctionJobs(scheduledAuction);

    logger.info('Demo data restored', {
      liveAuction: liveAuction.title,
      liveAuctionId: liveAuction._id.toString(),
      image: DEMO_IMAGE,
    });
  } finally {
    await disconnectMongo();
    await disconnectRedis();
  }
}

restoreDemoData().catch((err) => {
  logger.error('Restore failed', { error: err.message });
  process.exit(1);
});
