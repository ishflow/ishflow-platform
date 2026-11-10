'use server';

import { requireTenantContext } from '@/platform/auth/current-context';
import {
  createUpgradeRequestRecord,
  createUpgradeRequestSchema,
  notifyUpgradeRequest,
} from '@/platform/super-admin/upgrade';

export type RequestUpgradeState =
  | { ok: true }
  | { ok: false; error: 'invalid' | 'unauthenticated' | 'unknown' }
  | null;

/**
 * Tenant-facing upgrade-request producer (web). Resolves `tenantId` / `userId` /
 * company name / contact email from the verified server context (NEVER from
 * `formData`); only phone / plan / note come from the form. Shaped for
 * `useActionState`. Mirrors the support-ticket action.
 */
export async function requestUpgrade(
  _prev: RequestUpgradeState,
  formData: FormData,
): Promise<RequestUpgradeState> {
  const planRaw = String(formData.get('requestedPlan') ?? '').trim();
  const noteRaw = String(formData.get('note') ?? '').trim();
  const parsed = createUpgradeRequestSchema.safeParse({
    contactPhone: String(formData.get('contactPhone') ?? ''),
    requestedPlan: planRaw === '' ? undefined : planRaw,
    note: noteRaw === '' ? undefined : noteRaw,
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return { ok: false, error: 'unauthenticated' };
  }
  if (!ctx.tenant) return { ok: false, error: 'unauthenticated' };

  try {
    await createUpgradeRequestRecord(parsed.data, {
      tenantId: ctx.tenant.id,
      userId: ctx.user.id,
      companyName: ctx.tenant.name,
      contactEmail: ctx.user.email,
    });
    // Best-effort: a flaky mail provider must never fail the request.
    await notifyUpgradeRequest({
      companyName: ctx.tenant.name,
      contactEmail: ctx.user.email,
      contactPhone: parsed.data.contactPhone,
      requestedPlan: parsed.data.requestedPlan ?? null,
      note: parsed.data.note ?? null,
    });
  } catch {
    return { ok: false, error: 'unknown' };
  }
  return { ok: true };
}
