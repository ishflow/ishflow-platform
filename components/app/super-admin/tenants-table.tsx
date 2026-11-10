import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import type { SuperAdminDict } from '@/platform/super-admin/dict';
import type { TenantRow } from '@/platform/super-admin/list-tenants';
import type { TenantPlan, TenantStatus } from '@prisma/client';
import Link from 'next/link';

export interface TenantsTableFilters {
  q?: string;
  plan?: TenantPlan | '';
  status?: TenantStatus | '';
}

interface TenantsTableProps {
  rows: ReadonlyArray<TenantRow>;
  nextCursor: string | null;
  filters: TenantsTableFilters;
  dict: SuperAdminDict;
}

const PLANS: ReadonlyArray<TenantPlan> = ['free', 'starter', 'pro', 'business', 'enterprise'];
const STATUSES: ReadonlyArray<TenantStatus> = [
  'active',
  'trialing',
  'past_due',
  'suspended',
  'cancelled',
];

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

function statusVariant(status: TenantStatus): BadgeVariant {
  switch (status) {
    case 'active':
      return 'default';
    case 'trialing':
      return 'secondary';
    case 'past_due':
      return 'destructive';
    case 'suspended':
    case 'cancelled':
      return 'outline';
    default:
      return 'secondary';
  }
}

function planVariant(plan: TenantPlan): BadgeVariant {
  if (plan === 'free') return 'secondary';
  return 'default';
}

function formatMrrUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDate(date: Date | null, dashFallback: string): string {
  if (!date) return dashFallback;
  return new Date(date).toLocaleDateString('en-US');
}

function buildLoadMoreHref(filters: TenantsTableFilters, cursor: string): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.plan) params.set('plan', filters.plan);
  if (filters.status) params.set('status', filters.status);
  params.set('cursor', cursor);
  return `/super-admin/tenants?${params.toString()}`;
}

export function TenantsTable({ rows, nextCursor, filters, dict }: TenantsTableProps) {
  const hasFilters = Boolean(filters.q || filters.plan || filters.status);
  const t = dict.tenants;
  const planLabels = dict.subscription.planOptions;
  const statusLabels = dict.subscription.statusOptions;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="pt-6">
          <form
            method="GET"
            action="/super-admin/tenants"
            className="flex flex-wrap items-end gap-3"
          >
            <div className="flex-1 min-w-[16rem]">
              <Input
                type="text"
                name="q"
                defaultValue={filters.q ?? ''}
                placeholder={t.filters.searchPlaceholder}
              />
            </div>
            <Select name="plan" defaultValue={filters.plan || 'all'}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t.filters.allPlans} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.filters.allPlans}</SelectItem>
                {PLANS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {planLabels[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="status" defaultValue={filters.status || 'all'}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t.filters.allStatuses} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.filters.allStatuses}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">{dict.common.apply}</Button>
            {hasFilters && (
              <Button variant="ghost" render={<Link href="/super-admin/tenants" />}>
                {dict.common.clear}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columns.name}</TableHead>
                <TableHead>{t.columns.plan}</TableHead>
                <TableHead>{t.columns.status}</TableHead>
                <TableHead>{t.columns.currency}</TableHead>
                <TableHead className="text-right">{t.columns.members}</TableHead>
                <TableHead className="text-right">{t.columns.mrr}</TableHead>
                <TableHead>{t.columns.lastActivity}</TableHead>
                <TableHead>{t.columns.createdAt}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/super-admin/tenants/${row.id}`}
                      className="text-foreground hover:underline"
                    >
                      {row.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{row.slug}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={planVariant(row.plan)}>{planLabels[row.plan]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>{statusLabels[row.status]}</Badge>
                  </TableCell>
                  <TableCell>{row.currency}</TableCell>
                  <TableCell className="text-right">{row.memberCount}</TableCell>
                  <TableCell className="text-right font-mono">{formatMrrUsd(row.mrrUsd)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(row.lastActivityAt, dict.common.dash)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(row.createdAt, dict.common.dash)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" render={<Link href={buildLoadMoreHref(filters, nextCursor)} />}>
            {dict.common.loadMore}
          </Button>
        </div>
      )}
    </div>
  );
}
