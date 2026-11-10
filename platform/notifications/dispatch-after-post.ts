import type { AppContext } from '@/platform/auth/current-context';
import type { DocumentConfig } from '@/platform/metadata';
import { dispatchPaymentReceived } from './dispatch-payment-received';

/**
 * Centralised post-document notification fan-out. Called from the document
 * actions layer after `postDocument` returns successfully. Switches on
 * `config.id` so the platform engine doesn't need any knowledge of specific
 * document modules. Errors are swallowed — email failures must never block
 * the user-facing post action.
 */
export async function dispatchAfterPost(
  ctx: AppContext,
  config: DocumentConfig,
  docId: string,
): Promise<void> {
  if (!ctx.tenant) return;
  const tenantId = ctx.tenant.id;

  switch (config.id) {
    case 'sales.payment_received':
      await dispatchPaymentReceived(tenantId, docId);
      return;
    default:
      return;
  }
}
