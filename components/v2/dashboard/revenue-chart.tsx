'use client';

import { useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type RevenueChartProps = {
  title: string;
  totalLabel: string;
  changePct: number;
  periodLabel: string;
  /** One value per point. */
  points: number[];
  /** One label per point (1:1 with `points`); recharts thins the ticks. */
  labels: string[];
};

type Datum = { x: string; v: number };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Datum }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="chart-tip">
      <span className="chart-tip-label">{d.x}</span>
      <span className="chart-tip-value">{d.v.toLocaleString()}</span>
    </div>
  );
}

/**
 * Shared revenue/trend chart (dashboard widget + report `chart` sections).
 *
 * recharts area chart: smooth monotone line in `--chart-line`, gradient fill,
 * subtle horizontal grid, auto-thinned x ticks. Client component — server
 * parents pass serializable props (strings + number arrays).
 */
export function V2RevenueChart({
  title,
  totalLabel,
  changePct,
  periodLabel,
  points,
  labels,
}: RevenueChartProps) {
  const gradId = useId();
  const isUp = changePct >= 0;
  const data: Datum[] = points.map((v, i) => ({ x: labels[i] ?? '', v }));

  return (
    <div className="chart-card">
      <div className="chart-head">
        <div className="card-title">{title}</div>
        <span className="dim" style={{ fontSize: 12.5, fontWeight: 500 }}>
          {periodLabel}
        </span>
      </div>
      <div className="chart-value">
        {totalLabel}
        <span className="badge">
          {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(1)}%
        </span>
      </div>
      <div className="chart-recharts">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 6, bottom: 0, left: 6 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-line)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--chart-line)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tick={{ fontSize: 11, fill: 'var(--text-dim)' }}
              dy={6}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: 'var(--chart-line)', strokeOpacity: 0.25 }}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke="var(--chart-line)"
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 3, fill: 'var(--chart-line)' }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
