'use client';

import { BillingToggle } from '@/components/app/marketing/pricing/billing-toggle';
import { PricingCards } from '@/components/app/marketing/pricing/pricing-cards';
import type { PricingTableContent } from '@/platform/marketing/types';
import { useState } from 'react';

interface Props {
  table: PricingTableContent;
  labelMonth: string;
  labelYear: string;
}

export function PricingClient({ table, labelMonth, labelYear }: Props) {
  const [billing, setBilling] = useState<'month' | 'year'>('month');
  return (
    <div className="space-y-10">
      <div className="flex justify-center">
        <BillingToggle
          value={billing}
          onChange={setBilling}
          labelMonth={labelMonth}
          labelYear={labelYear}
        />
      </div>
      <PricingCards
        tiers={table.tiers}
        billing={billing}
        yearlyDiscountPct={table.yearlyDiscountPct}
      />
    </div>
  );
}
