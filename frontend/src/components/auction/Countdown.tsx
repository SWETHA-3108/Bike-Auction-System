import { useEffect, useState } from 'react';

interface CountdownProps {
  endTime: string;
  onEnd?: () => void;
  className?: string;
}

export function Countdown({ endTime, onEnd, className }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => getRemaining(endTime));

  useEffect(() => {
    const tick = () => {
      const next = getRemaining(endTime);
      setRemaining(next);
      if (next <= 0) onEnd?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime, onEnd]);

  if (remaining <= 0) {
    return <span className={className}>Ended</span>;
  }

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);

  return (
    <span className={className}>
      {h > 0 && `${h}h `}
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

function getRemaining(endTime: string) {
  const endMs = /^\d+$/.test(endTime) ? Number(endTime) : new Date(endTime).getTime();
  return Math.max(0, endMs - Date.now());
}
