import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectMongo, disconnectMongo } from '../../src/config/database.js';
import { connectRedis, disconnectRedis } from '../../src/config/redis.js';
import {
  clearDatabase,
  flushRedis,
  seedLiveAuctionFixture,
} from '../helpers/fixtures.js';

const app = createApp();

describe('bid flow', () => {
  beforeAll(async () => {
    await connectMongo();
    await connectRedis();
  });

  afterAll(async () => {
    await disconnectMongo();
    await disconnectRedis();
  });

  beforeEach(async () => {
    await clearDatabase();
    await flushRedis();
  });

  it('places a bid on a live auction', async () => {
    const { bidder, auction } = await seedLiveAuctionFixture();

    const login = await request(app).post('/v1/auth/login').send({
      email: bidder.email,
      password: 'Password123!',
    });
    const token = login.body.data.accessToken;

    const bidAmount = 1010000;
    const res = await request(app)
      .post(`/v1/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: bidAmount });

    expect(res.status).toBe(201);
    expect(res.body.data.bid.amount).toBe(bidAmount);
    expect(res.body.data.auction.currentPrice).toBe(bidAmount);
    expect(res.body.data.auction.bidCount).toBe(1);
  });

  it('rejects bid below minimum', async () => {
    const { bidder, auction } = await seedLiveAuctionFixture();

    const login = await request(app).post('/v1/auth/login').send({
      email: bidder.email,
      password: 'Password123!',
    });
    const token = login.body.data.accessToken;

    const res = await request(app)
      .post(`/v1/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1005000 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BID_TOO_LOW');
  });
});
