import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '../../lib/api';
import type { Auction, PlaceBidResult } from '../../types';
import { formatCents } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Countdown } from './Countdown';

interface BidPanelProps {
  auction: Auction;
  livePrice?: number;
  liveEndTime?: string;
  bidCount?: number;
  onBidPlaced?: (result: PlaceBidResult) => void;
}

export function BidPanel({ auction, livePrice, liveEndTime, bidCount, onBidPlaced }: BidPanelProps) {
  const currentPrice = livePrice ?? auction.liveState?.currentPrice ?? auction.currentPrice;
  const minBid = currentPrice + auction.minIncrement;
  const [amount, setAmount] = useState(String(minBid));
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (bidAmount: number) =>
      api.post<{ data: PlaceBidResult }>(`/auctions/${auction.id}/bids`, { amount: bidAmount }),
    onSuccess: (res) => {
      setError(null);
      setAmount(String(res.data.auction.currentPrice + auction.minIncrement));
      onBidPlaced?.(res.data);
      queryClient.invalidateQueries({ queryKey: ['auction', auction.id] });
      queryClient.invalidateQueries({ queryKey: ['bids', auction.id] });
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        const min = err.details?.minRequired as number | undefined;
        setError(min ? `${err.message} (min: ${formatCents(min)})` : err.message);
      } else {
        setError('Failed to place bid');
      }
    },
  });

  const isLive = auction.status === 'live';
  const endTime = liveEndTime ?? auction.liveState?.endTime ?? auction.endTime;

  return (
    <Card className="p-6 space-y-4 sticky top-24">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-slate-400">Current bid</p>
          <p className="text-3xl font-bold text-brand-400">{formatCents(currentPrice)}</p>
        </div>
        {isLive && (
          <div className="text-right">
            <p className="text-sm text-slate-400">Time left</p>
            <Countdown endTime={endTime} className="text-lg font-mono text-amber-300" />
          </div>
        )}
      </div>

      <p className="text-sm text-slate-500">
        {bidCount ?? auction.bidCount} bids · Min increment {formatCents(auction.minIncrement)}
      </p>

      {isLive ? (
        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-400">Your bid (cents)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={minBid}
              step={auction.minIncrement}
            />
            <p className="text-xs text-slate-500 mt-1">
              Min: {formatCents(minBid)} ({minBid} cents)
            </p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button
            className="w-full"
            size="lg"
            loading={mutation.isPending}
            onClick={() => mutation.mutate(Number(amount))}
          >
            Place Bid
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setAmount(String(minBid))}
          >
            Bid minimum ({formatCents(minBid)})
          </Button>
        </div>
      ) : (
        <p className="text-slate-400 text-center py-4">
          {auction.status === 'ended' ? 'This auction has ended.' : 'Auction is not live yet.'}
        </p>
      )}
    </Card>
  );
}
