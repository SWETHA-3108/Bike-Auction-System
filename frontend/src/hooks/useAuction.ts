import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Auction, Bid } from '../types';
import { useSocket } from './useSocket';

export function useAuctionLive(auctionId: string) {
  const { socket } = useSocket(auctionId);
  const [livePrice, setLivePrice] = useState<number | undefined>();
  const [liveEndTime, setLiveEndTime] = useState<string | undefined>();
  const [bidCount, setBidCount] = useState<number | undefined>();

  const query = useQuery({
    queryKey: ['auction', auctionId],
    queryFn: () => api.get<{ data: Auction }>(`/auctions/${auctionId}`),
  });

  useEffect(() => {
    if (!socket) return;

    const onSnapshot = (data: {
      liveState?: { currentPrice: number; endTime: string; bidCount: number };
    }) => {
      if (data.liveState) {
        setLivePrice(data.liveState.currentPrice);
        setLiveEndTime(data.liveState.endTime);
        setBidCount(data.liveState.bidCount);
      }
    };

    const onBidUpdate = (data: {
      amount: number;
      bidCount: number;
      auctionId: string;
    }) => {
      if (data.auctionId === auctionId) {
        setLivePrice(data.amount);
        setBidCount(data.bidCount);
      }
    };

    const onExtended = (data: { auctionId: string; newEndTime: string }) => {
      if (data.auctionId === auctionId) setLiveEndTime(data.newEndTime);
    };

    socket.on('auction:snapshot', onSnapshot);
    socket.on('bid:update', onBidUpdate);
    socket.on('auction:extended', onExtended);

    return () => {
      socket.off('auction:snapshot', onSnapshot);
      socket.off('bid:update', onBidUpdate);
      socket.off('auction:extended', onExtended);
    };
  }, [socket, auctionId]);

  return { ...query, livePrice, liveEndTime, bidCount };
}

export function useAuctionBids(auctionId: string) {
  return useQuery({
    queryKey: ['bids', auctionId],
    queryFn: () =>
      api.get<{ data: Bid[] }>(`/auctions/${auctionId}/bids?limit=20`),
    refetchInterval: 60000,
  });
}
