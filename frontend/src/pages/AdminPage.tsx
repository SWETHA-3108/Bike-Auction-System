import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatCents } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { statusColor } from '../lib/utils';

interface DashboardStats {
  liveCount: number;
  scheduledCount: number;
  bidsToday: number;
  totalUsers: number;
  recentAuctions: { id: string; title: string; status: string; currentPrice: number }[];
}

export function AdminPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.get<{ data: DashboardStats }>('/admin/dashboard'),
  });

  const stats = data?.data;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-800" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Live auctions" value={stats.liveCount} accent="text-emerald-400" />
            <StatCard label="Scheduled" value={stats.scheduledCount} accent="text-blue-400" />
            <StatCard label="Bids today" value={stats.bidsToday} accent="text-amber-400" />
            <StatCard label="Total users" value={stats.totalUsers} accent="text-slate-200" />
          </div>

          <Card className="p-6">
            <h2 className="font-semibold mb-4">Recent auctions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-800">
                    <th className="pb-2">Title</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentAuctions.map((a) => (
                    <tr key={a.id} className="border-b border-slate-800/50">
                      <td className="py-3">{a.title}</td>
                      <td className="py-3">
                        <Badge className={statusColor(a.status)}>{a.status}</Badge>
                      </td>
                      <td className="py-3 text-right font-medium">
                        {formatCents(a.currentPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent}`}>{value}</p>
    </Card>
  );
}
