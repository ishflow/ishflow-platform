import {
  type CashRegisterRow,
  V2CashRegisterList,
} from '@/components/v2/documents-extra/cash-registers/list';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { formatMoney } from '@/lib/format-money';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function V2CashRegisterListPage() {
  const t = await getTranslations('v2_documents_extra.cashRegisters');
  const locale = await getLocale();

  let tenantId = '';
  let tenantCurrency = 'USD';
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant?.id ?? '';
    tenantCurrency = ctx.tenant?.currency ?? 'USD';
  } catch {
    // Unauthenticated — render chrome with zero counts.
  }

  let rows: CashRegisterRow[] = [];
  if (tenantId) {
    rows = await withTenant(tenantId, async (tx) => {
      // Read openingBalance via raw SQL so a stale Prisma client (column
      // added at runtime, dev server not yet restarted) degrades to 0
      // instead of 500ing on an Unknown-arg error.
      const registers = (await tx.$queryRawUnsafe(
        `SELECT id, code, name, note, opening_balance AS "openingBalance"
         FROM catalog_treasury_cash_register
         WHERE deleted_at IS NULL
         ORDER BY name ASC`,
      )) as Array<{
        id: string;
        code: string;
        name: string;
        note: string | null;
        openingBalance: unknown;
      }>;
      if (registers.length === 0) return [];

      // Per-register signed balance from the cash_funds movement table.
      // active=true filters out reversed postings; sign comes from kind.
      const sums = await tx.movement_treasury_cash_funds.groupBy({
        by: ['cashRegister', 'kind'],
        where: { active: true },
        _sum: { amount: true },
      });

      const balanceByRegister = new Map<string, number>();
      for (const s of sums as Array<{
        cashRegister: string;
        kind: string;
        _sum: { amount: unknown };
      }>) {
        const amt = Number(s._sum.amount ?? 0);
        const signed = s.kind === 'income' ? amt : -amt;
        balanceByRegister.set(
          s.cashRegister,
          (balanceByRegister.get(s.cashRegister) ?? 0) + signed,
        );
      }

      return registers.map((r): CashRegisterRow => {
        const movements = balanceByRegister.get(r.id) ?? 0;
        const opening = Number(r.openingBalance ?? 0);
        const balance = opening + movements;
        const tone: CashRegisterRow['balanceTone'] =
          balance > 0 ? 'success' : balance < 0 ? 'danger' : 'neutral';
        return {
          id: r.id,
          code: r.code,
          name: r.name,
          note: r.note ?? undefined,
          balance: formatMoney(balance, locale, tenantCurrency),
          balanceTone: tone,
          status: { label: t('list.status.active'), tone: 'success' },
          detailHref: `/catalogs/cash-registers/${r.id}`,
        };
      });
    });
  }

  const total = rows.length;
  const activeCount = rows.filter((r) => r.status.tone === 'success').length;
  const archivedCount = rows.filter((r) => r.status.tone === 'neutral').length;

  return (
    <>
      <V2Topbar
        breadcrumb={t('list.breadcrumb')}
        title={t('list.title')}
        subtitle={t('list.subtitle', { count: total })}
      />
      <div className="content">
        <V2CashRegisterList
          columns={{
            code: t('list.col.code'),
            name: t('list.col.name'),
            note: t('list.col.note'),
            balance: t('list.col.balance'),
            status: t('list.col.status'),
          }}
          statuses={[
            { key: 'all', label: t('list.status.all'), count: total },
            { key: 'success', label: t('list.status.active'), count: activeCount },
            { key: 'neutral', label: t('list.status.archived'), count: archivedCount },
          ]}
          searchPlaceholder={t('list.search')}
          filterLabel={t('list.filter')}
          exportLabel={t('list.export')}
          newLabel={t('list.new')}
          newHref="/catalogs/cash-registers/new"
          rows={rows}
        />
      </div>
    </>
  );
}
