import type { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;

export function setSocketEmitter(server: SocketServer | null): void {
  io = server;
}

export function getSocketEmitter(): SocketServer | null {
  return io;
}
