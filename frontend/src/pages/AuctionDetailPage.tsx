import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../app/AuthProvider';
import { api } from '../lib/api';
import { formatCents, statusColor } from '../lib/utils';
import { useAuctionBids, useAuctionLive } from '../hooks/useAuction';
import { BidPanel } from '../components/auction/BidPanel';
import { BidHistory } from '../components/auction/BidHistory';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { PlaceBidResult } from '../types';

export function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, livePrice, liveEndTime, bidCount } = useAuctionLive(id!);
  const { data: bidsData, isLoading: bidsLoading, refetch: refetchBids } = useAuctionBids(id!);
  const [watching, setWatching] = useState<boolean | undefined>();

  const auction = data?.data;
  const isWatched = watching ?? auction?.isWatched ?? false;

  const watchMutation = useMutation({
    mutationFn: () =>
      isWatched
        ? api.delete(`/watchlist/${id}`)
        : api.post(`/watchlist/${id}`),
    onSuccess: () => {
      setWatching(!isWatched);
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const onBidPlaced = (_result: PlaceBidResult) => {
    refetchBids();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/2 rounded bg-slate-800" />
        <div className="h-64 rounded-xl bg-slate-800" />
      </div>
    );
  }

  if (!auction) {
    return <p className="text-slate-400">Auction not found.</p>;
  }

  const image = auction.motorcycle?.images?.[0];

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/" className="text-sm text-slate-500 hover:text-white">
            ← Back
          </Link>
          <Badge className={statusColor(auction.status)}>{auction.status}</Badge>
        </div>

        <div className="aspect-video overflow-hidden rounded-xl bg-slate-800">
          {image ? (
            <img src={image} alt={auction.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-600">No image</div>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold">{auction.title}</h1>
          {auction.motorcycle && (
            <p className="text-slate-400 mt-1">
              {auction.motorcycle.year} {auction.motorcycle.make} {auction.motorcycle.model} ·{' '}
              {auction.motorcycle.mileage?.toLocaleString()} mi · {auction.motorcycle.engineCc}cc
            </p>
          )}
        </div>

        {auction.motorcycle?.description && (
          <p className="text-slate-300 leading-relaxed">{auction.motorcycle.description}</p>
        )}

        <BidHistory bids={bidsData?.data ?? []} loading={bidsLoading} />
      </div>

      <div className="space-y-4">
        {isAuthenticated ? (
          <Button
            variant="secondary"
            className="w-full"
            loading={watchMutation.isPending}
            onClick={() => watchMutation.mutate()}
          >
            {isWatched ? '★ On watchlist' : '☆ Add to watchlist'}
          </Button>
        ) : (
          <Link to="/login">
            <Button variant="secondary" className="w-full">
              Login to bid
            </Button>
          </Link>
        )}

        {isAuthenticated ? (
          <BidPanel
            auction={auction}
            livePrice={livePrice}
            liveEndTime={liveEndTime}
            bidCount={bidCount}
            onBidPlaced={onBidPlaced}
          />
        ) : (
          <div className="rounded-xl border border-slate-800 p-6 text-center text-slate-400">
            <p className="text-2xl font-bold text-brand-400 mb-2">
              {formatCents(livePrice ?? auction.currentPrice)}
            </p>
            <p>Sign in to place bids</p>
          </div>
        )}
      </div>
    </div>
  );
}
