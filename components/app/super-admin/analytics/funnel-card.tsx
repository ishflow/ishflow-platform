'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { FunnelCounts } from '@/platform/super-admin/analytics/funnel';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';

interface FunnelCardProps {
  counts: FunnelCounts;
  dict: {
    title: string;
    description: string;
    steps: {
      signup: string;
      onboarded: string;
      firstInvoice: string;
      firstPayment: string;
      retained7d: string;
    };
  };
}

export function FunnelCard({ counts, dict }: FunnelCardProps) {
  const data = [
    { stage: dict.steps.signup, count: counts.signup },
    { stage: dict.steps.onboarded, count: counts.onboarded },
    { stage: dict.steps.firstInvoice, count: counts.firstInvoice },
    { stage: dict.steps.firstPayment, count: counts.firstPayment },
    { stage: dict.steps.retained7d, count: counts.retained7d },
  ];
  const config = {
    count: { label: 'count', color: 'var(--chart-1)' },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-[16/6] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid horizontal={false} />
            <YAxis dataKey="stage" type="category" tickLine={false} axisLine={false} width={140} />
            <XAxis type="number" hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]}>
              <LabelList dataKey="count" position="right" className="fill-foreground text-xs" />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
