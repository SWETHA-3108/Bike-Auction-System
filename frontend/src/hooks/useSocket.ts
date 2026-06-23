import { useEffect, useState } from 'react';
import { connectSocket, getSocket } from '../lib/socket';
import { getAccessToken } from '../lib/api';

export function useSocket(auctionId?: string) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = connectSocket(getAccessToken() ?? undefined);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !auctionId) return;

    socket.emit('join:auction', auctionId);
    return () => {
      socket.emit('leave:auction', auctionId);
    };
  }, [auctionId, connected]);

  return { connected, socket: getSocket() };
}
