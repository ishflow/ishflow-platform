'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { EASE } from './motion';

const TOTAL = 3.6;
const RAY_ANGLES = [0, 30, 60, 120, 150, 210, 240, 300, 330];

export function IntroSequence() {
  const reduced = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  // Flight start offset (screen center → TopBar slot), computed at mount so the
  // whole journey runs on pure transforms — no top/left unit interpolation.
  const [flight, setFlight] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setFlight({
      x: window.innerWidth / 2 - 24 - 132,
      y: window.innerHeight / 2 - 24 - 32,
    });
    const t = setTimeout(() => setHidden(true), reduced ? 100 : TOTAL * 1000);
    return () => clearTimeout(t);
  }, [reduced]);

  if (hidden || reduced) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-[oklch(0.15_0.008_250)]"
        animate={{ opacity: [1, 1, 0] }}
        transition={{ duration: TOTAL, times: [0, 0.82, 1], ease: EASE }}
      />

      {/* Concentric circles */}
      {[1, 2, 3].map((n) => (
        <motion.div
          key={n}
          className="absolute top-1/2 left-1/2 rounded-full border border-white/10"
          style={{
            width: 260 * n,
            height: 260 * n,
            x: '-50%',
            y: '-50%',
          }}
          initial={{ opacity: 0, scale: 0.15 }}
          animate={{ opacity: [0, 0.55, 0], scale: [0.15, 1, 1.4] }}
          transition={{
            duration: 2.4,
            delay: 1.22 + (n - 1) * 0.12,
            times: [0, 0.5, 1],
            ease: EASE,
          }}
        />
      ))}

      {/* Rays */}
      <svg
        className="absolute top-1/2 left-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 overflow-visible"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        {RAY_ANGLES.map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <motion.line
              key={deg}
              x1={50}
              y1={50}
              x2={50 + Math.cos(rad) * 60}
              y2={50 + Math.sin(rad) * 60}
              stroke="white"
              strokeOpacity={0.45}
              strokeWidth={0.12}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, 1, 1], opacity: [0, 0.65, 0] }}
              transition={{
                duration: 2,
                delay: 1.2 + i * 0.05,
                times: [0, 0.7, 1],
                ease: EASE,
              }}
            />
          );
        })}
      </svg>

      {/* Logo: width-clip reveal + pulse dot, then flight to the TopBar slot */}
      {flight && (
        <motion.div
          className="absolute top-6 left-6"
          style={{ transformOrigin: 'left top' }}
          initial={{ x: flight.x, y: flight.y, scale: 1 }}
          animate={{
            x: [flight.x, flight.x, flight.x, 0],
            y: [flight.y, flight.y, flight.y, 0],
            scale: [1, 1, 1, 0.375],
          }}
          transition={{ duration: TOTAL, times: [0, 0.6, 0.82, 1], ease: EASE }}
        >
          <div className="relative h-16 w-[264px]">
            <motion.div
              className="h-16 overflow-hidden"
              initial={{ width: 24, opacity: 0 }}
              animate={{ width: [24, 24, 24, 264, 264], opacity: [0, 0, 1, 1, 1] }}
              transition={{
                duration: TOTAL,
                times: [0, 0.3, 0.42, 0.78, 1],
                ease: EASE,
              }}
            >
              {logoFailed ? (
                <span className="fd block h-16 font-black text-[44px] text-white leading-[64px]">
                  ishflow
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/logo-dark.svg"
                  alt="ishflow"
                  className="h-16 w-[264px] max-w-none"
                  onError={() => setLogoFailed(true)}
                />
              )}
            </motion.div>
            {/* Pulse dot over the wordmark's blue period */}
            <motion.div
              className="absolute rounded-full bg-white"
              style={{ left: 106, top: 56, x: '-50%', y: '-50%' }}
              initial={{ width: 8, height: 8, opacity: 1 }}
              animate={{
                width: [8, 10, 64, 64],
                height: [8, 10, 64, 64],
                opacity: [1, 1, 0, 0],
              }}
              transition={{
                duration: TOTAL,
                times: [0, 0.18, 0.4, 1],
                ease: EASE,
              }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
