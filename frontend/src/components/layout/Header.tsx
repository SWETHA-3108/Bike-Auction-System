import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../app/AuthProvider';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ data: { count: number } }>('/notifications/unread-count'),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <span className="text-brand-500">⚡</span>
          <span>BikeAuction</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <Link to="/" className="hover:text-white transition">
            Auctions
          </Link>
          {isAuthenticated && (
            <>
              <Link to="/watchlist" className="hover:text-white transition">
                Watchlist
              </Link>
              <Link to="/notifications" className="hover:text-white transition relative">
                Notifications
                {(unread?.data.count ?? 0) > 0 && (
                  <span className="absolute -top-2 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                    {unread!.data.count}
                  </span>
                )}
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="hover:text-white transition text-amber-400">
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="hidden sm:block text-sm text-slate-400">{user?.fullName}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
