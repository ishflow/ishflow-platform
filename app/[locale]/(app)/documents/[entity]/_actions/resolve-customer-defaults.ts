'use server';

import '@/configs';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { z } from 'zod';

const Input = z.object({ customerId: z.string().uuid() });

/**
 * Fetches the customer's `defaultPriceType` so the sales invoice header can
 * auto-fill its `priceType` field on customer pick. Returns `null` on any
 * error — this is a UX convenience, never a correctness requirement.
 *
 * Includes the resolved price-type label alongside its id so the caller can
 * push the new selection into a controlled `<RefCombobox>` without a
 * second roundtrip.
 */
export async function resolveCustomerDefaults(raw: unknown): Promise<{
  defaultPriceType: string | null;
  defaultPriceTypeLabel: string | null;
} | null> {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return null;
  try {
    const { tenant } = await requireTenantContext();
    return await withTenant(tenant.id, async (tx) => {
      // biome-ignore lint/suspicious/noExplicitAny: prisma delegate not typed on tx generic
      const row = await (tx as any).catalog_sales_customer.findUnique({
        where: { id: parsed.data.customerId },
        select: { defaultPriceType: true },
      });
      const ptId = (row?.defaultPriceType as string | null) ?? null;
      if (!ptId) {
        return { defaultPriceType: null, defaultPriceTypeLabel: null };
      }
      // biome-ignore lint/suspicious/noExplicitAny: prisma delegate not typed
      const pt = await (tx as any).catalog_sales_price_type.findUnique({
        where: { id: ptId },
        select: { name: true, deletedAt: true },
      });
      if (!pt || pt.deletedAt) {
        return { defaultPriceType: null, defaultPriceTypeLabel: null };
      }
      return {
        defaultPriceType: ptId,
        defaultPriceTypeLabel: (pt.name as string | null) ?? null,
      };
    });
  } catch (err) {
    console.error('resolveCustomerDefaults failed', err);
    return null;
  }
}
