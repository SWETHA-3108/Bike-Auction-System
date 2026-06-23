import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Auction } from '../types';
import { AuctionCard } from '../components/auction/AuctionCard';

export function HomePage() {
  const { data: live, isLoading: liveLoading } = useQuery({
    queryKey: ['auctions', 'live'],
    queryFn: () => api.get<{ data: Auction[] }>('/auctions/live'),
  });

  const { data: upcoming, isLoading: upcomingLoading } = useQuery({
    queryKey: ['auctions', 'scheduled'],
    queryFn: () => api.get<{ data: Auction[] }>('/auctions?status=scheduled&limit=12'),
  });

  return (
    <div className="space-y-12">
      <section className="text-center py-8">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-brand-400 to-emerald-300 bg-clip-text text-transparent">
          Live Motorcycle Auctions
        </h1>
        <p className="mt-3 text-slate-400 max-w-xl mx-auto">
          Bid on premium used bikes in real-time. Secure, transparent, and exciting.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live now
        </h2>
        {liveLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-slate-800" />
            ))}
          </div>
        ) : live?.data.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {live.data.map((a) => (
              <AuctionCard key={a.id} auction={a} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No live auctions right now.</p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Upcoming</h2>
        {upcomingLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-slate-800" />
            ))}
          </div>
        ) : upcoming?.data.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.data.map((a) => (
              <AuctionCard key={a.id} auction={a} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No scheduled auctions.</p>
        )}
      </section>
    </div>
  );
}
