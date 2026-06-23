import { getRedis } from '../config/redis.js';
import { getSocketEmitter } from './emitters.js';

const SOCKET_RELAY_CHANNEL = 'socket:relay';

export interface SocketRelayMessage {
  room: string;
  event: string;
  payload: Record<string, unknown>;
}

export async function publishSocketRelay(message: SocketRelayMessage): Promise<void> {
  await getRedis().publish(SOCKET_RELAY_CHANNEL, JSON.stringify(message));
}

export async function subscribeSocketRelay(): Promise<void> {
  const sub = getRedis().duplicate();
  if (sub.status !== 'ready') {
    await sub.connect();
  }

  await sub.subscribe(SOCKET_RELAY_CHANNEL);
  sub.on('message', (_channel: string, message: string) => {
    try {
      const { room, event, payload } = JSON.parse(message) as SocketRelayMessage;
      const emitter = getSocketEmitter();
      if (emitter && room && event) {
        emitter.to(room).emit(event, payload);
      }
    } catch {
      // ignore malformed relay messages
    }
  });
}

/** Emit via Socket.IO on API, or Redis relay when running in worker process. */
export async function emitToRoom(
  room: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const emitter = getSocketEmitter();
  if (emitter) {
    emitter.to(room).emit(event, payload);
    return;
  }
  await publishSocketRelay({ room, event, payload });
}

export function maskHighBidderId(userId: string | undefined | null): string | null {
  if (!userId) return null;
  if (userId.length <= 4) return 'Bidder ***';
  return `Bidder ***${userId.slice(-4)}`;
}
