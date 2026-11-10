'use client';

import { useEffect, useState } from 'react';

interface CountdownProps {
  until: string;
  labels: {
    countdownLabel: string;
    countdownEnded: string;
  };
}

function diff(target: number): {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
} {
  const ms = target - Date.now();
  if (ms <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { hours, minutes, seconds, expired: false };
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function MaintenanceCountdown({ until, labels }: CountdownProps) {
  const target = new Date(until).getTime();
  const [snapshot, setSnapshot] = useState(() => diff(target));

  useEffect(() => {
    if (Number.isNaN(target)) return;
    const id = setInterval(() => setSnapshot(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (Number.isNaN(target)) return null;
  if (snapshot.expired) {
    return <p className="text-sm text-muted-foreground">{labels.countdownEnded}</p>;
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground">{labels.countdownLabel}</span>
      <span className="font-mono text-3xl font-semibold tabular-nums">
        {pad(snapshot.hours)}:{pad(snapshot.minutes)}:{pad(snapshot.seconds)}
      </span>
    </div>
  );
}
