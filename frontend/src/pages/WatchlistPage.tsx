import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Auction } from '../types';
import { formatCents, formatDate, statusColor } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

interface WatchlistItem {
  id: string;
  auctionId: string;
  auction?: Partial<Auction>;
  createdAt: string;
}

export function WatchlistPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => api.get<{ data: WatchlistItem[] }>('/watchlist'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Watchlist</h1>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-800" />
          ))}
        </div>
      ) : data?.data.length ? (
        <div className="space-y-3">
          {data.data.map((item) => (
            <Link key={item.id} to={`/auctions/${item.auctionId}`}>
              <Card className="p-4 flex justify-between items-center hover:border-brand-500/40 transition">
                <div>
                  <p className="font-medium">{item.auction?.title ?? 'Auction'}</p>
                  <p className="text-sm text-slate-500">Added {formatDate(item.createdAt)}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  {item.auction?.status && (
                    <Badge className={statusColor(item.auction.status)}>{item.auction.status}</Badge>
                  )}
                  {item.auction?.currentPrice != null && (
                    <span className="font-semibold text-brand-400">
                      {formatCents(item.auction.currentPrice)}
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-slate-500">No watched auctions. Browse live auctions to add some.</p>
      )}
    </div>
  );
}
