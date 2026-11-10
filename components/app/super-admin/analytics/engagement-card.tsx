'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface EngagementCardProps {
  dau: number;
  wau: number;
  mau: number;
  daily: Array<{ day: string; actors: number }>;
  dict: {
    title: string;
    description: string;
    dauLabel: string;
    wauLabel: string;
    mauLabel: string;
  };
}

export function EngagementCard({ dau, wau, mau, daily, dict }: EngagementCardProps) {
  const chartData = daily.map((p) => ({ ...p, label: p.day.slice(5) }));
  const config = {
    actors: { label: dict.dauLabel, color: 'var(--chart-1)' },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label={dict.dauLabel} value={dau} />
          <Stat label={dict.wauLabel} value={wau} />
          <Stat label={dict.mauLabel} value={mau} />
        </div>
        <ChartContainer config={config} className="aspect-[16/4] w-full">
          <AreaChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="actors"
              stroke="var(--color-actors)"
              fill="var(--color-actors)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-2xl tabular-nums text-foreground">{value}</p>
    </div>
  );
}
