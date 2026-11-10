'use server';

import { requireTenantContext } from '@/platform/auth/current-context';
import { createSupportTicketRecord, createSupportTicketSchema } from '@/platform/support';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

/**
 * Tenant-facing support-ticket producer (web).
 *
 * Thin wrapper over the reusable `platform/support` helper:
 *   1. Resolve the authenticated tenant context (`tenantId` + `userId` come
 *      from the verified server context — NEVER from `formData`).
 *   2. Validate `subject` + `body` with zod at the boundary.
 *   3. Capture `urlCaptured` (referer) + `browserAgent` (user-agent) from the
 *      request headers.
 *   4. Create an `open` ticket via `withBypass` (the table has no tenant RLS).
 *
 * Shaped for `useActionState`: returns `{ ok }` rather than throwing on a
 * validation miss, so the client form can render an inline error.
 */

export type CreateSupportTicketState =
  | { ok: true }
  | { ok: false; error: 'invalid' | 'unauthenticated' | 'unknown' }
  | null;

export async function createSupportTicket(
  _prev: CreateSupportTicketState,
  formData: FormData,
): Promise<CreateSupportTicketState> {
  const parsed = createSupportTicketSchema.safeParse({
    subject: String(formData.get('subject') ?? ''),
    body: String(formData.get('body') ?? ''),
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return { ok: false, error: 'unauthenticated' };
  }

  const h = await headers();

  try {
    await createSupportTicketRecord(parsed.data, {
      tenantId: ctx.tenant.id,
      userId: ctx.user.id,
      urlCaptured: h.get('referer'),
      browserAgent: h.get('user-agent'),
    });
  } catch {
    return { ok: false, error: 'unknown' };
  }

  revalidatePath('/support');
  return { ok: true };
}
