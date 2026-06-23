import { connectMongo, disconnectMongo } from '../config/database.js';
import { connectRedis, disconnectRedis } from '../config/redis.js';
import { User } from '../models/User.js';
import { Motorcycle } from '../models/Motorcycle.js';
import { Auction } from '../models/Auction.js';
import { hashPassword } from './auth.js';
import { logger } from './logger.js';
import { initAuctionState } from '../redis/auctionState.js';
import { scheduleAuctionJobs } from '../jobs/queues.js';

export async function seedDevelopmentData() {
  await connectMongo();
  await connectRedis();

  try {
    const existingAuction = await Auction.findOne({ title: 'Live: Harley Street Glide' });
    if (existingAuction) {
      logger.info('Seed skipped — demo data already exists');
      return;
    }

    logger.info('Seeding development data...');

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
        fullName: 'Test Bidder',
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
      images: ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800'],
      location: { city: 'Austin', state: 'TX' },
      status: 'listed',
    });

    const now = Date.now();
    const liveAuction = await Auction.create({
      motorcycleId: motorcycle._id,
      sellerId: admin._id,
      title: 'Live: Harley Street Glide',
      status: 'live',
      startTime: new Date(now - 3600000),
      endTime: new Date(now + 7200000),
      originalEndTime: new Date(now + 7200000),
      startingPrice: 1200000,
      currentPrice: 1200000,
      minIncrement: 25000,
      bidCount: 0,
      startedAt: new Date(now - 3600000),
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
      startTime: new Date(now + 86400000),
      endTime: new Date(now + 90000000),
      originalEndTime: new Date(now + 90000000),
      startingPrice: 1100000,
      currentPrice: 1100000,
      minIncrement: 20000,
    });
    await scheduleAuctionJobs(scheduledAuction);

    logger.info('Seed complete', {
      admin: 'admin@bikeauction.com / Admin123!',
      bidder: 'bidder@example.com / Bidder123!',
      liveAuctionId: liveAuction._id.toString(),
      scheduledAuctionId: scheduledAuction._id.toString(),
    });
  } finally {
    await disconnectMongo();
    await disconnectRedis();
  }
}

seedDevelopmentData().catch((err) => {
  logger.error('Seed failed', { error: err.message });
  process.exit(1);
});
