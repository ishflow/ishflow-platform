import { PlanFeatureGate } from '@/components/billing/plan-feature-gate';
import type { ReactNode } from 'react';

// Period-close is a Pro+ feature; gate the whole section in one place.
export default function PeriodCloseLayout({ children }: { children: ReactNode }) {
  return <PlanFeatureGate feature="periodClose">{children}</PlanFeatureGate>;
}
