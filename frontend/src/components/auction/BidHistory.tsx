import type { Bid } from '../../types';
import { formatCents, formatDate } from '../../lib/utils';
import { Card } from '../ui/Card';

interface BidHistoryProps {
  bids: Bid[];
  loading?: boolean;
}

export function BidHistory({ bids, loading }: BidHistoryProps) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Bid history</h3>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-slate-800" />
          ))}
        </div>
      ) : bids.length === 0 ? (
        <p className="text-slate-500 text-sm">No bids yet.</p>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto">
          {bids.map((bid) => (
            <li
              key={bid.id}
              className="flex justify-between items-center rounded-lg bg-slate-800/50 px-3 py-2 text-sm"
            >
              <span className="text-slate-300">{bid.bidderName}</span>
              <div className="text-right">
                <span className="font-semibold text-brand-400">{formatCents(bid.amount)}</span>
                <p className="text-xs text-slate-500">{formatDate(bid.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
