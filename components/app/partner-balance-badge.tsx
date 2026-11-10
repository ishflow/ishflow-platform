'use client';

import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/format-money';
import type { Locale } from '@/platform/metadata';
import { useEffect, useState } from 'react';

interface PartnerBalanceBadgeProps {
  type: 'customer' | 'supplier';
  partnerId: string | null;
  locale: Locale;
  currency: string;
}

export function PartnerBalanceBadge({
  type,
  partnerId,
  locale,
  currency,
}: PartnerBalanceBadgeProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!partnerId) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ type, id: partnerId });
        const response = await fetch(`/api/partner-balance?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setBalance(data.balance);
        } else {
          setBalance(null);
        }
      } catch {
        setBalance(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [partnerId, type]);

  if (!partnerId || balance === null) {
    return null;
  }

  if (loading) {
    return (
      <Badge variant="outline" className="ml-2 text-xs">
        ...
      </Badge>
    );
  }

  // Format: +₺X (yeşil) veya -₺X (kırmızı)
  const isPositive = balance > 0;
  const isNegative = balance < 0;
  const formattedBalance = formatMoney(Math.abs(balance), locale, currency);
  const displayValue = isPositive ? `+${formattedBalance}` : `-${formattedBalance}`;

  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  let className = 'ml-2 text-xs';

  if (isPositive) {
    // Onlar bize borçlu (alacaklıyız) - Yeşil
    className +=
      ' bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100';
  } else if (isNegative) {
    // Biz onlara borçluyuz - Kırmızı
    variant = 'destructive';
  }

  return (
    <Badge variant={variant} className={className}>
      {displayValue}
    </Badge>
  );
}
