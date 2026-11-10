import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMoney } from '@/lib/format-money';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { getTenantDocuments, getTenantOverview } from '@/platform/super-admin/tenant-detail';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const TYPE_KEYS = [
  'sales_invoice',
  'purchases_invoice',
  'sales_payment_received',
  'purchases_payment_sent',
] as const;

type KnownType = (typeof TYPE_KEYS)[number];

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

function statusVariant(status: string): BadgeVariant {
  if (status === 'posted') return 'default';
  if (status === 'draft') return 'secondary';
  if (status === 'cancelled') return 'destructive';
  return 'outline';
}

export default async function TenantDocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { tenantId } = await params;
  const { type } = await searchParams;
  const filterType = type && (TYPE_KEYS as ReadonlyArray<string>).includes(type) ? type : undefined;

  const [overview, { rows }, dict] = await Promise.all([
    getTenantOverview(tenantId),
    getTenantDocuments(tenantId, { type: filterType, limit: 100 }),
    getSuperAdminDict(),
  ]);
  if (!overview) notFound();

  const { tenant } = overview;
  const locale = tenant.defaultLocale ?? 'en';
  const d = dict.tenantDetail.documents;

  const TYPE_LABELS: Record<KnownType, string> = {
    sales_invoice: d.types.salesInvoice,
    purchases_invoice: d.types.purchasesInvoice,
    sales_payment_received: d.types.salesPaymentReceived,
    purchases_payment_sent: d.types.purchasesPaymentSent,
  };

  function labelForType(t: string): string {
    return (TYPE_LABELS as Record<string, string>)[t] ?? t;
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{d.title.replace('{count}', String(rows.length))}</h2>
        <form method="get" className="flex items-center gap-2">
          <Select name="type" defaultValue={filterType ?? 'all'}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder={d.filterAll} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{d.filterAll}</SelectItem>
              {TYPE_KEYS.map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit">{d.apply}</Button>
        </form>
      </header>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{d.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{d.columns.type}</TableHead>
                <TableHead>{d.columns.code}</TableHead>
                <TableHead>{d.columns.date}</TableHead>
                <TableHead className="text-right">{d.columns.total}</TableHead>
                <TableHead>{d.columns.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((doc) => (
                <TableRow key={`${doc.type}:${doc.id}`}>
                  <TableCell>
                    <Badge variant="outline">{labelForType(doc.type)}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{doc.number}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(doc.date)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMoney(doc.total, locale, tenant.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(doc.status)} className="capitalize">
                      {doc.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
