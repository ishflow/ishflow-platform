'use client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  value: 'month' | 'year';
  onChange: (v: 'month' | 'year') => void;
  labelMonth: string;
  labelYear: string;
}

export function BillingToggle({ value, onChange, labelMonth, labelYear }: Props) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as 'month' | 'year')}
      className="inline-flex"
    >
      <TabsList className="rounded-full bg-card border border-border p-1">
        <TabsTrigger value="month" className="rounded-full px-4 text-xs">
          {labelMonth}
        </TabsTrigger>
        <TabsTrigger value="year" className="rounded-full px-4 text-xs">
          {labelYear}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
