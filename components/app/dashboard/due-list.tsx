import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/format-money';
import Link from 'next/link';

type Item = { id: string; name: string; amount: number; date: string; href: string };

export function DueList({
  title,
  emptyLabel,
  items,
  locale,
  currency,
}: {
  title: string;
  emptyLabel: string;
  items: Item[];
  locale: string;
  currency: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 p-0">
        {items.length === 0 ? (
          <div className="px-6 pb-4 text-sm text-muted-foreground">{emptyLabel}</div>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center justify-between px-6 py-2 text-sm hover:bg-muted/50"
            >
              <div className="flex flex-col">
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.date}</span>
              </div>
              <span className="tabular-nums">{formatMoney(item.amount, locale, currency)}</span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
