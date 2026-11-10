'use client';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  reverse?: boolean;
  pauseOnHover?: boolean;
  className?: string;
  durationSeconds?: number;
}

export function Marquee({
  children,
  reverse = false,
  pauseOnHover = true,
  className,
  durationSeconds = 30,
}: Props) {
  return (
    <div
      className={cn(
        'group flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]',
        className,
      )}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          aria-hidden={i === 1 ? 'true' : undefined}
          className={cn(
            'flex shrink-0 items-center gap-12 px-6',
            reverse ? 'animate-marquee-reverse' : 'animate-marquee',
            pauseOnHover && 'group-hover:[animation-play-state:paused]',
          )}
          style={{ animationDuration: `${durationSeconds}s` }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
