import { env } from './env.js';

export const bullmqConnection = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null as null,
  ...(env.REDIS_URL.startsWith('rediss://') ? { tls: {} } : {}),
};
