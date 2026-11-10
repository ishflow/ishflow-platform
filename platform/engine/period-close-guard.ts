import type { AppContext } from '@/platform/auth/current-context';
import { checkPeriodOpen } from './period-close';
import { hasPermission } from './permissions';

/**
 * Throws PeriodClosedError if `docDate` falls in a closed period,
 * UNLESS the caller holds `admin.period:manage`.
 *
 * Used before every document write, post, and unpost.
 */
export async function assertPeriodOpen(
  ctx: AppContext,
  docDate: Date,
  tx: unknown,
  module: string,
): Promise<void> {
  if (hasPermission(ctx.permissions, 'admin.period:manage')) return;
  if (!ctx.tenant) throw new Error('assertPeriodOpen: no tenant in context');
  await checkPeriodOpen(tx, ctx.tenant.id, module, docDate);
}
