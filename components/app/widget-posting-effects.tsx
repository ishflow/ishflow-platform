import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMoney } from '@/lib/format-money';
import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import {
  type PresentationRef,
  getPresentationsForRefs,
  movementDelegate,
  presentationKey,
} from '@/platform/engine';
import { type DocumentConfig, type Locale, getRegistry } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';

export async function PostingEffectsWidget({
  ctx,
  docConfig,
  docId,
  docStatus,
  locale,
}: {
  ctx: AppContext & { tenant: NonNullable<AppContext['tenant']> };
  docConfig: DocumentConfig;
  docId: string;
  docStatus: string;
  locale: Locale;
}) {
  const tDoc = await getTranslations('document');
  const tReg = await getTranslations('register');
  const currency = ctx.tenant.currency;

  if (docStatus !== 'POSTED') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tDoc('widgetPostingEffects')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{tDoc('widgetNotPostedYet')}</p>
        </CardContent>
      </Card>
    );
  }

  const registerIds = Object.keys(docConfig.posting ?? {});
  const registry = getRegistry().register;
  const blocks = await Promise.all(
    registerIds.map(async (rid) => {
      const cfg = registry[rid];
      if (!cfg) return null;
      const rows = await withTenant(ctx.tenant.id, (tx) =>
        movementDelegate(tx, cfg).findMany({
          where: { docRef: docId, active: true },
          orderBy: { timestamp: 'asc' },
        }),
      );
      return { cfg, rows };
    }),
  );

  const dimensionRefs: PresentationRef[] = [];
  for (const b of blocks) {
    if (!b) continue;
    for (const row of b.rows) {
      for (const d of Object.keys(b.cfg.dimensions)) {
        const v = (row as Record<string, unknown>)[d];
        if (typeof v === 'string' && v.length > 0) {
          const dim = b.cfg.dimensions[d];
          if (dim && dim.type === 'reference') {
            const to = dim.to;
            dimensionRefs.push({ typeId: `${to.module}.${to.name}`, id: v });
          }
        }
      }
    }
  }
  const tenantId = ctx.tenant?.id;
  const dimensionLabels = tenantId
    ? await withTenant(tenantId, (tx) =>
        getPresentationsForRefs(ctx, dimensionRefs, { locale, tx }),
      )
    : await getPresentationsForRefs(ctx, dimensionRefs, { locale });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tDoc('widgetPostingEffects')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {blocks.map((b) => {
          if (!b) return null;
          const { cfg, rows } = b;
          const title = cfg.label[locale] ?? cfg.label.en;
          const dimensions = Object.keys(cfg.dimensions);
          const resources = Object.keys(cfg.resources);
          return (
            <div key={cfg.id} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{title}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tReg('columnKind')}</TableHead>
                    {dimensions.map((d) => (
                      <TableHead key={d}>
                        {cfg.dimensions[d]?.label[locale] ?? cfg.dimensions[d]?.label.en ?? d}
                      </TableHead>
                    ))}
                    {resources.map((r) => (
                      <TableHead key={r}>
                        {cfg.resources[r]?.label[locale] ?? cfg.resources[r]?.label.en ?? r}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id as string}>
                      <TableCell>
                        <Badge variant={row.kind === 'income' ? 'default' : 'outline'}>
                          {tReg(`kind.${row.kind as 'income' | 'expense'}`)}
                        </Badge>
                      </TableCell>
                      {dimensions.map((d) => {
                        const v = (row as Record<string, unknown>)[d];
                        if (typeof v !== 'string' || v.length === 0) {
                          return <TableCell key={d}>—</TableCell>;
                        }
                        const dim = cfg.dimensions[d];
                        const to = dim && dim.type === 'reference' ? dim.to : undefined;
                        const label = to
                          ? dimensionLabels.get(presentationKey(`${to.module}.${to.name}`, v))
                          : null;
                        return (
                          <TableCell key={d}>
                            <span title={v}>{label ?? v.slice(0, 8)}</span>
                          </TableCell>
                        );
                      })}
                      {resources.map((r) => {
                        const isMoney = cfg.resources[r]?.type === 'money';
                        const signed = isMoney && docConfig.direction !== undefined;
                        const formatted = isMoney
                          ? formatMoney(
                              row[r] as number | string | null | undefined,
                              locale,
                              currency,
                            )
                          : String(row[r] ?? 0);
                        const display = signed
                          ? `${docConfig.direction === 'in' ? '+' : '−'}${formatted}`
                          : formatted;
                        const signClass = signed
                          ? docConfig.direction === 'in'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                          : '';
                        return (
                          <TableCell
                            key={r}
                            className={`tabular-nums${signClass ? ` ${signClass}` : ''}`}
                          >
                            {display}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
