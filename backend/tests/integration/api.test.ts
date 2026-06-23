import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectMongo, disconnectMongo } from '../../src/config/database.js';
import { connectRedis, disconnectRedis } from '../../src/config/redis.js';
import { clearDatabase, flushRedis } from '../helpers/fixtures.js';

const app = createApp();

describe('health endpoints', () => {
  beforeAll(async () => {
    await connectMongo();
    await connectRedis();
  });

  afterAll(async () => {
    await disconnectMongo();
    await disconnectRedis();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /health/ready checks mongo and redis', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks.mongo).toBe('ok');
    expect(res.body.checks.redis).toBe('ok');
  });

  it('GET /metrics returns prometheus format', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_request_duration_seconds');
  });
});

describe('auth endpoints', () => {
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

  it('registers and logs in a user', async () => {
    const register = await request(app).post('/v1/auth/register').send({
      email: 'newuser@test.com',
      password: 'Password123!',
      fullName: 'New User',
    });
    expect(register.status).toBe(201);
    expect(register.body.data.email).toBe('newuser@test.com');

    const login = await request(app).post('/v1/auth/login').send({
      email: 'newuser@test.com',
      password: 'Password123!',
    });
    expect(login.status).toBe(200);
    expect(login.body.data.accessToken).toBeDefined();

    const me = await request(app)
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.fullName).toBe('New User');
  });
});
