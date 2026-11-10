import { redirect } from 'next/navigation';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';

export const dynamic = 'force-dynamic';

/**
 * Support is hidden until an in-app ticket-creation path exists. The
 * `SupportTicket` table currently has no producer anywhere in the codebase,
 * so this page could only ever show an empty stub. The original ticket-list
 * implementation is preserved in git history (pre-2026-05-29) and should be
 * restored alongside the tenant-facing support form + SA assign/close actions.
 */
export default async function SupportPage() {
  await assertSuperAdmin();
  redirect('/super-admin');
}
