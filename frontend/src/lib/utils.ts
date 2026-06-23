/** Amounts are stored in integer cents */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function statusColor(status: string): string {
  switch (status) {
    case 'live':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'scheduled':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    case 'ended':
      return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    case 'cancelled':
      return 'bg-red-500/20 text-red-300 border-red-500/40';
    default:
      return 'bg-slate-600/20 text-slate-300 border-slate-600/40';
  }
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
