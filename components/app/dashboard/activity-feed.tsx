import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck2, FilePlus2, HandCoins, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

type ActivityKind = 'saved' | 'posted' | 'paid';

type Item = {
  id: string;
  kind: ActivityKind;
  label: string;
  href: string;
  timestamp: string;
};

const iconFor: Record<ActivityKind, LucideIcon> = {
  saved: FilePlus2,
  posted: FileCheck2,
  paid: HandCoins,
};

export function ActivityFeed({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: Item[];
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
          items.map((item) => {
            const Icon = iconFor[item.kind];
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 px-6 py-2 text-sm hover:bg-muted/50"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">{item.label}</div>
                <span className="text-xs text-muted-foreground">
                  {item.timestamp.slice(0, 16).replace('T', ' ')}
                </span>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
