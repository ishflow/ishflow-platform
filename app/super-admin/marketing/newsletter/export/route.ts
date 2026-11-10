import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { listNewsletterSubscribers, subscribersToCsv } from '@/platform/super-admin/marketing';

export const dynamic = 'force-dynamic';

/**
 * GET /super-admin/marketing/newsletter/export
 *
 * Returns every subscriber as a CSV. SA-only — calls `assertSuperAdmin`
 * which 404s the route for non-operators (same pattern as the rest of
 * the super-admin route group).
 */
export async function GET(): Promise<Response> {
  await assertSuperAdmin();
  const rows = await listNewsletterSubscribers();
  const csv = subscribersToCsv(rows);
  const filename = `ishflow-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
