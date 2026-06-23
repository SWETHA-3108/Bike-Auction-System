import mongoose from 'mongoose';
import { getRedis } from '../../src/config/redis.js';
import { User } from '../../src/models/User.js';
import { Motorcycle } from '../../src/models/Motorcycle.js';
import { Auction } from '../../src/models/Auction.js';
import { hashPassword } from '../../src/utils/auth.js';
import { initAuctionState } from '../../src/redis/auctionState.js';

export async function clearDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 1) return;
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  );
}

export async function flushRedis(): Promise<void> {
  const redis = getRedis();
  if (redis.status !== 'ready') await redis.connect();
  try {
    await redis.flushdb();
  } catch {
    const patterns = ['auction:*', 'idempotency:*', 'rate:*', 'cache:*'];
    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    }
  }
}

export async function seedLiveAuctionFixture() {
  const seller = await User.create({
    email: 'seller@test.com',
    passwordHash: await hashPassword('Password123!'),
    fullName: 'Test Seller',
    role: 'admin',
    isEmailVerified: true,
  });

  const bidder = await User.create({
    email: 'bidder@test.com',
    passwordHash: await hashPassword('Password123!'),
    fullName: 'Test Bidder',
    role: 'bidder',
    isEmailVerified: true,
  });

  const motorcycle = await Motorcycle.create({
    sellerId: seller._id,
    title: 'Test Bike',
    make: 'Yamaha',
    bikeModel: 'R1',
    year: 2021,
    mileage: 5000,
    engineCc: 998,
    color: 'Blue',
    condition: 'excellent',
    description: 'Test motorcycle',
    images: [],
    location: { city: 'Austin', state: 'TX' },
    status: 'listed',
  });

  const now = Date.now();
  const auction = await Auction.create({
    motorcycleId: motorcycle._id,
    sellerId: seller._id,
    title: 'Test Live Auction',
    status: 'live',
    startTime: new Date(now - 3600000),
    endTime: new Date(now + 7200000),
    originalEndTime: new Date(now + 7200000),
    startingPrice: 1000000,
    currentPrice: 1000000,
    minIncrement: 10000,
    bidCount: 0,
    startedAt: new Date(now - 3600000),
  });

  await initAuctionState(auction._id.toString(), {
    currentPrice: auction.startingPrice,
    highBidderId: null,
    bidCount: 0,
    endTime: auction.endTime.getTime().toString(),
    status: 'live',
    extensionCount: 0,
  });

  return { seller, bidder, motorcycle, auction };
}
