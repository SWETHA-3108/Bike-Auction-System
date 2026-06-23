import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Notification } from '../types';
import { formatDate } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { connectSocket, getSocket } from '../lib/socket';
import { getAccessToken } from '../lib/api';

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ data: Notification[] }>('/notifications?limit=50'),
  });

  useEffect(() => {
    const socket = connectSocket(getAccessToken());
    const onNew = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    };
    socket.on('notification:new', onNew);
    return () => {
      getSocket()?.off('notification:new', onNew);
    };
  }, [queryClient]);

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button variant="secondary" size="sm" onClick={() => markAllRead.mutate()}>
          Mark all read
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-800" />
          ))}
        </div>
      ) : data?.data.length ? (
        <ul className="space-y-3">
          {data.data.map((n) => (
            <li key={n.id}>
              <Card
                className={`p-4 ${n.status !== 'read' ? 'border-brand-500/30 bg-brand-950/20' : ''}`}
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-medium">{n.title}</p>
                    <p className="text-sm text-slate-400 mt-1">{n.body}</p>
                    <p className="text-xs text-slate-500 mt-2">{formatDate(n.createdAt)}</p>
                    {typeof n.data.auctionId === 'string' && (
                      <Link
                        to={`/auctions/${n.data.auctionId}`}
                        className="text-sm text-brand-400 hover:underline mt-1 inline-block"
                      >
                        View auction →
                      </Link>
                    )}
                  </div>
                  {n.status !== 'read' && (
                    <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)}>
                      Mark read
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-500">No notifications yet.</p>
      )}
    </div>
  );
}
