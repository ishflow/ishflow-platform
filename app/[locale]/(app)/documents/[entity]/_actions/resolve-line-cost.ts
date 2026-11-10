'use server';

import '@/configs';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getProductAvgCost } from '@/platform/engine/pricing';
import type { AccumulationRegisterConfig } from '@/platform/metadata';
import { getRegistry } from '@/platform/metadata';
import { z } from 'zod';

const Input = z.object({
  productId: z.string().uuid(),
});

/**
 * Returns the live average cost of a product, used by the price-setting
 * line editor to (a) hint at the floor price and (b) flag rows where the
 * user has typed a sale price below cost. Mirrors `resolveLinePrice`'s
 * "best-effort, never throw" contract so the line UI degrades silently
 * when costs are unavailable instead of breaking the form.
 */
export async function resolveLineCost(raw: unknown) {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return null;

  try {
    const { tenant } = await requireTenantContext();
    const stockRegister = getRegistry().register['inventory.stock_balance'] as
      | AccumulationRegisterConfig
      | undefined;
    if (!stockRegister) return null;

    return await withTenant(tenant.id, async (tx) => {
      const { cost, quantity } = await getProductAvgCost(tx, stockRegister, parsed.data.productId);
      return { cost, quantity };
    });
  } catch (err) {
    console.error('resolveLineCost failed', err);
    return null;
  }
}
