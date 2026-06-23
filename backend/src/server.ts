import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectMongo, disconnectMongo } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { initSocketIO, closeSocketIO } from './socket/index.js';
import { subscribeNotificationEvents } from './socket/notificationBridge.js';
import { subscribeSocketRelay } from './socket/relayBridge.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  await connectMongo();
  await connectRedis();

  const app = createApp();
  const server = http.createServer(app);
  const io = await initSocketIO(server);

  await subscribeNotificationEvents();
  await subscribeSocketRelay();

  server.listen(env.PORT, () => {
    logger.info('Server started', { port: env.PORT, env: env.NODE_ENV });
  });

  const shutdown = async (signal: string) => {
    logger.info('Shutdown signal received', { signal });
    server.close(async () => {
      await closeSocketIO(io);
      await disconnectMongo();
      await disconnectRedis();
      logger.info('Server shut down gracefully');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});
