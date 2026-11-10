'use client';

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

type Point = { date: string; sales: number; collections: number };

export function TrendChart({
  data,
  salesLabel,
  collectionsLabel,
}: {
  data: Point[];
  salesLabel: string;
  collectionsLabel: string;
}) {
  const config = {
    sales: { label: salesLabel, color: 'var(--chart-1)' },
    collections: { label: collectionsLabel, color: 'var(--chart-2)' },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="aspect-[16/5] w-full">
      <AreaChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="sales"
          stroke="var(--color-sales)"
          fill="var(--color-sales)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="collections"
          stroke="var(--color-collections)"
          fill="var(--color-collections)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
