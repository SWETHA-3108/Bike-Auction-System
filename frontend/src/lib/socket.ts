import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token?: string | null): Socket {
  if (socket?.connected) {
    if (token) socket.auth = { token };
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function updateSocketAuth(token: string | null) {
  if (!socket) return;
  socket.auth = token ? { token } : {};
  if (socket.connected) {
    socket.disconnect();
    socket.connect();
  }
}
