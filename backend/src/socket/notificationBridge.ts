import { getRedis } from '../config/redis.js';
import { getSocketEmitter } from './emitters.js';

const NOTIFICATION_CHANNEL = 'notifications:emit';

export async function publishNotificationEvent(payload: Record<string, unknown>) {
  await getRedis().publish(NOTIFICATION_CHANNEL, JSON.stringify(payload));
}

export async function subscribeNotificationEvents(): Promise<void> {
  const sub = getRedis().duplicate();
  if (sub.status !== 'ready') {
    await sub.connect();
  }

  await sub.subscribe(NOTIFICATION_CHANNEL);
  sub.on('message', (_channel: string, message: string) => {
    try {
      const payload = JSON.parse(message);
      const emitter = getSocketEmitter();
      if (emitter && payload.userId) {
        emitter.to(`user:${payload.userId}`).emit('notification:new', payload);
      }
    } catch {
      // ignore parse errors
    }
  });
}
