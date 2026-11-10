import type { Prisma } from '@prisma/client';

/**
 * Resolved VAT configuration for the current tenant.
 * - `enabled` — the `admin.tax.taxEnabled` master toggle.
 * - `ratePct` — `admin.tax.defaultTaxRatePct` (0 when unset/invalid).
 *
 * VAT is EXCLUSIVE (added on top of the price). See
 * the internal design spec.
 */
export type TaxSettings = { enabled: boolean; ratePct: number };

/**
 * Read the tenant's VAT settings from `admin.tax`. Relies on RLS to scope the
 * lookup to the current tenant — the posting/report `tx` is already inside
 * `withTenant`, so no tenantId argument is needed. Safe defaults: disabled, 0%.
 */
export async function resolveTaxSettings(tx: Prisma.TransactionClient): Promise<TaxSettings> {
  const row = await (
    tx as unknown as {
      tenantSettings: {
        findFirst: (a: unknown) => Promise<{ payload: unknown } | null>;
      };
    }
  ).tenantSettings.findFirst({ where: { key: 'admin.tax' }, select: { payload: true } });
  const payload = (row?.payload ?? {}) as Record<string, unknown>;
  const enabled = payload.taxEnabled === true;
  const raw = payload.defaultTaxRatePct;
  const rate = typeof raw === 'number' ? raw : Number(raw ?? 0);
  const ratePct = Number.isFinite(rate) && rate > 0 ? rate : 0;
  return { enabled, ratePct };
}

/**
 * Exclusive VAT amount for a subtotal, rounded to 2 decimals. Returns 0 when
 * tax is disabled or the rate is 0 — so callers can unconditionally add it.
 */
export function computeVat(subtotal: number, tax: TaxSettings): number {
  if (!tax.enabled || tax.ratePct <= 0) return 0;
  const vat = subtotal * (tax.ratePct / 100);
  return Number.isFinite(vat) ? Math.round(vat * 100) / 100 : 0;
}
