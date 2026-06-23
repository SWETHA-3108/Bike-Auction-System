import dotenv from 'dotenv';

dotenv.config();

/**
 * Runs before any test file imports application modules.
 * CI sets MONGODB_URI / REDIS_URL via workflow env.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/bike_auction_test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-minimum-32-chars-long';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-minimum-32-chars-long';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.LOG_LEVEL = 'error';
