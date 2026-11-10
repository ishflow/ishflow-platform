import type { ReactNode } from 'react';

interface Props {
  v2: ReactNode;
  legacy: ReactNode;
}

export function MarketingV2Boundary({ v2, legacy }: Props) {
  return process.env.NEXT_PUBLIC_MARKETING_V2 === 'false' ? <>{legacy}</> : <>{v2}</>;
}
