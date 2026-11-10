'use client';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 12,
  delay = 0,
  colorFrom = 'oklch(72% 0.16 270)',
  colorTo = 'oklch(60% 0.2 290)',
}: Props) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden',
        className,
      )}
      style={{
        ['--size' as string]: `${size}px`,
        ['--duration' as string]: `${duration}s`,
        ['--delay' as string]: `${delay}s`,
        ['--color-from' as string]: colorFrom,
        ['--color-to' as string]: colorTo,
      }}
    >
      <div
        className="absolute inset-[-1px] rounded-[inherit]"
        style={{
          background:
            'conic-gradient(from var(--angle, 0deg) at 50% 50%, transparent 0deg, var(--color-from) 40deg, var(--color-to) 80deg, transparent 120deg, transparent 360deg)',
          padding: '1px',
          animation: 'border-beam var(--duration) linear infinite',
          animationDelay: 'var(--delay)',
          // mask to cut out interior so only the border shows
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          maskComposite: 'exclude',
        }}
      />
    </div>
  );
}
