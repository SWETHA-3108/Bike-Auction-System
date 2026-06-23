import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Server as HttpServer } from 'http';
import { getRedis } from '../config/redis.js';
import { env } from '../config/env.js';
import { verifySocketToken } from './auth.middleware.js';
import { getAuctionState } from '../redis/auctionState.js';
import { Auction } from '../models/Auction.js';
import { setSocketEmitter } from './emitters.js';
import { activeSocketConnections, auctionLiveCount } from '../utils/metrics.js';
import { logger } from '../utils/logger.js';

interface SocketUser {
  id: string;
  email: string;
  role: string;
}

declare module 'socket.io' {
  interface SocketData {
    user: SocketUser | null;
  }
}

async function createRedisPubSubClients() {
  const pubClient = getRedis().duplicate();
  const subClient = getRedis().duplicate();

  const connectIfNeeded = async (client: ReturnType<typeof getRedis>) => {
    if (client.status !== 'ready') {
      await client.connect();
    }
  };

  await Promise.all([connectIfNeeded(pubClient), connectIfNeeded(subClient)]);
  return { pubClient, subClient };
}

async function refreshLiveAuctionGauge(): Promise<void> {
  const count = await Auction.countDocuments({ status: 'live' });
  auctionLiveCount.set(count);
}

export async function initSocketIO(httpServer: HttpServer): Promise<Server> {
  const { pubClient, subClient } = await createRedisPubSubClients();

  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.adapter(createAdapter(pubClient, subClient));
  setSocketEmitter(io);

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      socket.data.user = null;
      return next();
    }
    const payload = verifySocketToken(token);
    if (!payload) return next(new Error('Unauthorized'));
    socket.data.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  });

  io.on('connection', (socket: Socket) => {
    activeSocketConnections.inc();
    logger.debug('Socket connected', { socketId: socket.id, userId: socket.data.user?.id });

    if (socket.data.user) {
      socket.join(`user:${socket.data.user.id}`);
      if (socket.data.user.role === 'admin') {
        socket.join('admin:auctions');
      }
    }

    socket.on('join:auction', async (auctionId: string) => {
      if (!auctionId || typeof auctionId !== 'string') return;
      const auction = await Auction.findById(auctionId).select('status title').lean();
      if (!auction || Array.isArray(auction)) return;

      const auctionDoc = auction as unknown as { title: string; status: string };
      socket.join(`auction:${auctionId}`);
      const liveState = await getAuctionState(auctionId);
      socket.emit('auction:snapshot', {
        auctionId,
        title: auctionDoc.title,
        status: auctionDoc.status,
        liveState,
      });
    });

    socket.on('leave:auction', (auctionId: string) => {
      if (auctionId) socket.leave(`auction:${auctionId}`);
    });

    socket.on('join:live', () => {
      socket.join('auctions:live');
    });

    socket.on('leave:live', () => {
      socket.leave('auctions:live');
    });

    socket.on('disconnect', () => {
      activeSocketConnections.dec();
      logger.debug('Socket disconnected', { socketId: socket.id });
    });
  });

  await refreshLiveAuctionGauge();
  logger.info('Socket.IO initialized');

  return io;
}

export async function closeSocketIO(io: Server): Promise<void> {
  await new Promise<void>((resolve) => {
    io.close(() => resolve());
  });
  setSocketEmitter(null);
}
