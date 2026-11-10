import { V2Topbar } from '@/components/v2/shell/topbar';
import { V2SupportForm } from '@/components/v2/support/support-form';
import { V2TicketHistory } from '@/components/v2/support/ticket-history';
import { requireTenantContext } from '@/platform/auth/current-context';
import { listTenantSupportTickets } from '@/platform/support';
import type { TenantSupportTicket } from '@/platform/support';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function V2SupportPage() {
  const t = await getTranslations('v2_support');

  let tickets: TenantSupportTicket[] = [];
  try {
    const ctx = await requireTenantContext();
    tickets = await listTenantSupportTickets(ctx.tenant.id);
  } catch {
    /* unauthenticated or no tenant — render page without history */
  }

  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <div className="w-full lg:max-w-2xl">
            <V2SupportForm />
          </div>
          {tickets.length > 0 ? (
            <div className="w-full lg:max-w-xl">
              <V2TicketHistory tickets={tickets} />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
