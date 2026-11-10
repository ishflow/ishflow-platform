'use client';

import { useEffect, useRef } from 'react';

export function MarketingSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let rafId = 0;
    let pendingX = window.innerWidth / 2;
    let pendingY = window.innerHeight / 3;

    const apply = () => {
      rafId = 0;
      el.style.setProperty('--mx', `${pendingX}px`);
      el.style.setProperty('--my', `${pendingY}px`);
    };

    const onMove = (e: PointerEvent) => {
      pendingX = e.clientX;
      pendingY = e.clientY;
      if (!rafId) rafId = requestAnimationFrame(apply);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-testid="marketing-spotlight"
      className="pointer-events-none fixed inset-0 -z-10 [--mx:50vw] [--my:33vh]"
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(520px circle at var(--mx) var(--my), var(--marketing-accent-soft), transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(40% 60% at 80% 90%, oklch(72% 0.16 270 / 0.15), transparent 70%)',
        }}
      />
    </div>
  );
}
