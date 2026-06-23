import { Link } from 'react-router-dom';
import type { Auction } from '../../types';
import { formatCents, statusColor } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Countdown } from './Countdown';

interface AuctionCardProps {
  auction: Auction;
}

export function AuctionCard({ auction }: AuctionCardProps) {
  const image = auction.motorcycle?.images?.[0];
  const price = auction.liveState?.currentPrice ?? auction.currentPrice;

  return (
    <Link to={`/auctions/${auction.id}`}>
      <Card className="group overflow-hidden transition hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-900/20">
        <div className="aspect-video overflow-hidden bg-slate-800">
          {image ? (
            <img
              src={image}
              alt={auction.title}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-600">No image</div>
          )}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-100 line-clamp-1">{auction.title}</h3>
            <Badge className={statusColor(auction.status)}>{auction.status}</Badge>
          </div>
          {auction.motorcycle && (
            <p className="text-sm text-slate-400">
              {auction.motorcycle.year} {auction.motorcycle.make} {auction.motorcycle.model}
            </p>
          )}
          <div className="flex items-end justify-between pt-2">
            <div>
              <p className="text-xs text-slate-500">Current bid</p>
              <p className="text-xl font-bold text-brand-400">{formatCents(price)}</p>
            </div>
            {auction.status === 'live' && (
              <div className="text-right">
                <p className="text-xs text-slate-500">Ends in</p>
                <Countdown
                  endTime={auction.liveState?.endTime ?? auction.endTime}
                  className="font-mono text-sm text-amber-300"
                />
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
