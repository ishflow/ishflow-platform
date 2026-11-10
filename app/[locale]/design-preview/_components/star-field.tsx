'use client';

import { useEffect, useRef } from 'react';

type Star = {
  x: number;
  y: number;
  r: number;
  o: number;
  ts: number;
  to: number;
};

type RingStar = Star & { off: number };

export function StarField({
  count = 600,
  className = 'pointer-events-none absolute inset-0',
  ring = false,
  ringCount = 240,
  ringRadiusFactor = 0.36,
  ringBandWidth = 52,
}: {
  count?: number;
  className?: string;
  ring?: boolean;
  ringCount?: number;
  ringRadiusFactor?: number;
  ringBandWidth?: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let stars: Star[] = [];
    let ringStars: RingStar[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = window.devicePixelRatio || 1;

    const build = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars = Array.from({ length: count }, () => {
        const t = Math.random();
        const r =
          t < 0.65
            ? 0.25 + Math.random() * 0.25
            : t < 0.92
              ? 0.5 + Math.random() * 0.3
              : 0.8 + Math.random() * 0.5;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r,
          o: 0.2 + Math.random() * 0.75,
          ts: 0.4 + Math.random() * 1.2,
          to: Math.random() * Math.PI * 2,
        };
      });

      ringStars = [];
      if (ring) {
        const cx = w / 2;
        const cy = h / 2;
        const ringR = Math.min(w, h) * ringRadiusFactor;
        const half = ringBandWidth / 2;
        for (let i = 0; i < ringCount * 2; i++) {
          const ang = Math.random() * Math.PI * 2;
          const u1 = Math.random() || 1e-6;
          const u2 = Math.random();
          const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          const off = gauss * half * 0.65;
          const dist = ringR + off;
          const t = Math.random();
          const r =
            t < 0.7
              ? 0.15 + Math.random() * 0.15
              : t < 0.93
                ? 0.3 + Math.random() * 0.2
                : 0.5 + Math.random() * 0.2;
          ringStars.push({
            x: cx + Math.cos(ang) * dist,
            y: cy + Math.sin(ang) * dist,
            r,
            o: 0.25 + Math.random() * 0.55,
            ts: 0.3 + Math.random(),
            to: Math.random() * Math.PI * 2,
            off,
          });
        }
      }
    };

    const ro = new ResizeObserver(build);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    build();

    const draw = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        const tw = 0.55 + 0.45 * (Math.sin(t * s.ts + s.to) * 0.5 + 0.5);
        const a = s.o * tw;
        if (s.r > 1.1) {
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
          g.addColorStop(0, `rgba(255,255,255,${a * 0.3})`);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (ring) {
        const cx = w / 2;
        const cy = h / 2;
        const ringR = Math.min(w, h) * ringRadiusFactor;
        const halo = ctx.createRadialGradient(
          cx,
          cy,
          Math.max(0, ringR - ringBandWidth * 4),
          cx,
          cy,
          ringR + ringBandWidth * 4,
        );
        halo.addColorStop(0, 'rgba(255,255,255,0)');
        halo.addColorStop(0.42, 'rgba(255,255,255,0.022)');
        halo.addColorStop(0.5, 'rgba(255,255,255,0.038)');
        halo.addColorStop(0.58, 'rgba(255,255,255,0.022)');
        halo.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, w, h);

        for (const s of ringStars) {
          const tw = 0.55 + 0.45 * (Math.sin(t * s.ts + s.to) * 0.5 + 0.5);
          const fall = Math.max(0.15, 1 - Math.abs(s.off) / (ringBandWidth * 0.65));
          const a = s.o * tw * fall;
          if (s.r > 1.0) {
            const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
            g.addColorStop(0, `rgba(255,255,255,${a * 0.4})`);
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = `rgba(255,255,255,${a})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [count, ring, ringCount, ringRadiusFactor, ringBandWidth]);

  return <canvas ref={ref} className={className} style={{ zIndex: 0 }} aria-hidden />;
}
