'use server';

import '@/configs';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { resolvePrice } from '@/platform/engine/pricing';
import type { AccumulationRegisterConfig } from '@/platform/metadata';
import { getRegistry } from '@/platform/metadata';
import { z } from 'zod';

const Input = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
  date: z.coerce.date(),
  priceTypeId: z.string().uuid().nullable().optional(),
});

/**
 * Wraps `resolvePrice` (Task 3e, 1C-style 4-layer chain) so the sales invoice
 * line editor can preview auto-suggested prices. Returns the same shape as
 * `resolvePrice`; callers render a hint string and optionally copy `price`
 * into the line's `price` field when the user hasn't dirtied it yet.
 *
 * Returns `null` when input is incomplete or any runtime error occurs: this
 * action is a hint preview, not a hard requirement, so we never want it to
 * surface as an unhandled promise rejection on the client (which previously
 * bubbled up and broke `/documents/sales.invoice/new` entirely).
 */
export async function resolveLinePrice(raw: unknown) {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return null;

  try {
    const { tenant } = await requireTenantContext();

    const stockRegister = getRegistry().register['inventory.stock_balance'] as
      | AccumulationRegisterConfig
      | undefined;
    if (!stockRegister) return null;

    return await withTenant(tenant.id, async (tx) => {
      let effectivePriceTypeId = parsed.data.priceTypeId ?? null;
      if (!effectivePriceTypeId) {
        // biome-ignore lint/suspicious/noExplicitAny: prisma delegate not typed on tx generic
        const customer = await (tx as any).catalog_sales_customer.findUnique({
          where: { id: parsed.data.customerId },
          select: { defaultPriceType: true },
        });
        effectivePriceTypeId = (customer?.defaultPriceType as string | null) ?? null;
      }
      return resolvePrice(tx, stockRegister, {
        tenantId: tenant.id,
        customerId: parsed.data.customerId,
        productId: parsed.data.productId,
        date: parsed.data.date,
        priceTypeId: effectivePriceTypeId,
      });
    });
  } catch (err) {
    console.error('resolveLinePrice failed', err);
    return null;
  }
}
