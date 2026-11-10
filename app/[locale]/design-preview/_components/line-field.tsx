'use client';

import { motion } from 'framer-motion';
import { EASE } from './motion';

type Variant = 'hero' | 'engine' | 'modules' | 'marvels' | 'marvelsBottom';

type Line = [number, number, number, number];

const LINES: Record<Variant, Line[]> = {
  hero: [
    [0, 0, 22, 100],
    [50, 0, 82, 100],
    [100, 0, 58, 100],
    [0, 35, 100, 80],
    [100, 10, 0, 70],
    [30, 0, 100, 55],
  ],
  engine: [
    [22, 0, 14, 100],
    [58, 0, 48, 100],
    [82, 0, 86, 100],
    [0, 20, 100, 90],
    [100, 15, 0, 80],
  ],
  modules: [
    [14, 0, 28, 100],
    [48, 0, 64, 100],
    [86, 0, 92, 100],
    [0, 30, 100, 75],
    [100, 5, 0, 90],
  ],
  marvels: [
    [28, 0, 18, 100],
    [64, 0, 50, 100],
    [92, 0, 80, 100],
    [0, 15, 100, 85],
  ],
  marvelsBottom: [
    [10, 30, 45, 35],
    [55, 28, 92, 32],
    [8, 55, 40, 58],
    [60, 62, 90, 60],
    [20, 78, 80, 82],
  ],
};

type Marker = { line: number; t: number; label: string };

const MARKERS: Partial<Record<Variant, Marker[]>> = {
  hero: [
    { line: 1, t: 0.38, label: '001207 сф-проводка (2482к.00)' },
    { line: 3, t: 0.62, label: '000318 остаток-мск (3321.14)' },
    { line: 5, t: 0.28, label: '000642 касса-движ (5512.06)' },
  ],
  engine: [
    { line: 0, t: 0.55, label: '033910 регистр-ар (2287.92)' },
    { line: 3, t: 0.72, label: '067452 метаданные (8841.45)' },
  ],
  modules: [
    { line: 1, t: 0.41, label: '010248 продажи-док (6634.27)' },
    { line: 4, t: 0.58, label: '084210 закупки-док (1192.63)' },
    { line: 2, t: 0.83, label: '057023 склад-рег (4458.81)' },
  ],
};

export function LineField({ variant = 'hero' }: { variant?: Variant }) {
  const lines = LINES[variant];
  const markers = MARKERS[variant] ?? [];
  const strokeOpacity = variant === 'marvelsBottom' ? 0.22 : 0.1;

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full select-none"
      style={{ zIndex: 0 }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {lines.map((l, i) => (
        <motion.line
          key={`${l[0]}-${l[1]}-${l[2]}-${l[3]}`}
          x1={l[0]}
          y1={l[1]}
          x2={l[2]}
          y2={l[3]}
          stroke="white"
          strokeOpacity={strokeOpacity}
          strokeWidth={0.75}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1.4, delay: i * 0.12, ease: EASE }}
        />
      ))}
      {markers.map((m, i) => {
        const l = lines[m.line];
        if (!l) return null;
        const x = l[0] + (l[2] - l[0]) * m.t;
        const y = l[1] + (l[3] - l[1]) * m.t;
        const [first, ...rest] = m.label.split(' ');
        return (
          <motion.g
            key={m.label}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 1.2 + i * 0.25, ease: EASE }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          >
            <circle cx={x} cy={y} r={0.18} fill="white" opacity={0.95} />
            <text
              x={x + 0.5}
              y={y - 0.6}
              fill="white"
              opacity={0.55}
              fontSize={0.8}
              style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.02em' }}
            >
              {first}
              {rest.map((w) => (
                <tspan key={w} x={x + 0.5} dy="0.9em">
                  {w}
                </tspan>
              ))}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}
