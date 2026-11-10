'use server';

import '@/configs';
import { type AppContext, requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import {
  InvalidStatusError,
  NotFoundError,
  PeriodClosedError,
  PermissionDeniedError,
  PlanLimitError,
  PostingValidationError,
  buildZodSchema,
  createDocument,
  deleteDocument,
  getDocument,
  postDocument,
  rollbackDraftDocument,
  unpostDocument,
  updateDocument,
} from '@/platform/engine';
import { hasPermission } from '@/platform/engine/permissions';
import { type CatalogConfig, getRegistry } from '@/platform/metadata';
import { dispatchAfterPost } from '@/platform/notifications/dispatch-after-post';
import { dispatchInvoiceSent } from '@/platform/notifications/dispatch-invoice-sent';
import type { ActionResult } from '@/platform/ui';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';

function fireAfterPost(
  ctx: AppContext,
  config: CatalogConfig | ReturnType<typeof resolveConfig>,
  id: string,
) {
  if (!config) return;
  // `after` keeps the function alive past the response on Vercel; locally falls
  // back to a void promise. Errors are swallowed — email delivery must never
  // fail a user-facing post action.
  after(() =>
    dispatchAfterPost(ctx, config as Parameters<typeof dispatchAfterPost>[1], id).catch((err) => {
      console.warn('[notifications] dispatchAfterPost failed', { docId: id, err });
    }),
  );
}

function resolveConfig(entity: string) {
  return getRegistry().document[entity];
}

/**
 * Build a synthetic CatalogConfig from the document's header so buildZodSchema
 * (Sprint 2) can be reused for header validation. Permissions don't matter
 * here — we only need `fields`.
 */
function headerAsCatalog(config: ReturnType<typeof resolveConfig>): CatalogConfig {
  if (!config) throw new Error('headerAsCatalog: config is null');
  return {
    id: config.id,
    module: config.module,
    name: config.name,
    label: config.label,
    fields: config.header,
    permissions: config.permissions,
  };
}

/** If the wizard captured attachments under a client-generated draft id, rebind
 *  the Attachment rows from that draft id to the freshly-created document id.
 *  Idempotent — updateMany is a no-op if nothing matches. Mirrors the rebind
 *  in app/api/mobile/documents/[type]/route.ts. */
async function rebindDraftAttachments(
  tenantId: string,
  entityKey: string,
  newId: string,
  attachmentDraftId: string | null,
): Promise<void> {
  if (!attachmentDraftId) return;
  await withTenant(tenantId, async (tx) =>
    tx.attachment.updateMany({
      where: {
        tenantId,
        entity: `document.${entityKey}`,
        entityId: attachmentDraftId,
      },
      data: { entityId: newId },
    }),
  );
}

export async function createDocumentRecord(
  locale: string,
  entity: string,
  values: Record<string, unknown>,
  attachmentDraftId: string | null = null,
): Promise<ActionResult> {
  const config = resolveConfig(entity);
  if (!config) return { ok: false, formError: 'notFound' };
  try {
    const ctx = await requireTenantContext();
    const parsed = buildZodSchema(headerAsCatalog(config), config.lines).safeParse(values);
    if (!parsed.success) {
      return { ok: false, fieldErrors: mapFieldErrors(parsed.error.flatten().fieldErrors) };
    }
    const created = (await createDocument(ctx, config, parsed.data)) as { id: string } & Record<
      string,
      unknown
    >;
    if (ctx.tenant) {
      await rebindDraftAttachments(ctx.tenant.id, config.id, created.id, attachmentDraftId);
    }
    revalidatePath(`/${locale}/documents/${entity}`, 'page');
    revalidatePath(`/${locale}/dashboard`, 'page');
    return { ok: true, data: created, redirectTo: `/${locale}/documents/${entity}` };
  } catch (error) {
    return mapError(error);
  }
}

export async function createAndPostDocumentRecord(
  locale: string,
  entity: string,
  values: Record<string, unknown>,
  attachmentDraftId: string | null = null,
): Promise<ActionResult> {
  const config = resolveConfig(entity);
  if (!config) return { ok: false, formError: 'notFound' };
  try {
    const ctx = await requireTenantContext();
    const parsed = buildZodSchema(headerAsCatalog(config), config.lines).safeParse(values);
    if (!parsed.success) {
      return { ok: false, fieldErrors: mapFieldErrors(parsed.error.flatten().fieldErrors) };
    }
    const created = (await createDocument(ctx, config, parsed.data)) as { id: string } & Record<
      string,
      unknown
    >;
    if (ctx.tenant) {
      await rebindDraftAttachments(ctx.tenant.id, config.id, created.id, attachmentDraftId);
    }
    try {
      await postDocument(ctx, config, created.id);
    } catch (error) {
      // Atomic Save-and-Post: the post failed (insufficient stock, plan limit,
      // period closed, validation…), so roll back the just-created draft. A
      // left-behind draft is hidden from the user, who then thinks nothing
      // saved and retries — creating duplicates (#7/#50). Best-effort: surface
      // the original posting error regardless of cleanup success.
      try {
        await rollbackDraftDocument(ctx, config, created.id);
      } catch {
        // ignore — the posting error below is what the user needs to see
      }
      revalidatePath(`/${locale}/documents/${entity}`, 'page');
      return mapError(error);
    }
    fireAfterPost(ctx, config, created.id);
    revalidatePath(`/${locale}/documents/${entity}`, 'page');
    revalidatePath(`/${locale}/dashboard`, 'page');
    return { ok: true, data: created, redirectTo: `/${locale}/documents/${entity}` };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateDocumentRecord(
  locale: string,
  entity: string,
  id: string,
  values: Record<string, unknown>,
): Promise<ActionResult> {
  const config = resolveConfig(entity);
  if (!config) return { ok: false, formError: 'notFound' };
  try {
    const ctx = await requireTenantContext();
    const parsed = buildZodSchema(headerAsCatalog(config), config.lines).safeParse(values);
    if (!parsed.success) {
      return { ok: false, fieldErrors: mapFieldErrors(parsed.error.flatten().fieldErrors) };
    }
    const updated = await updateDocument(ctx, config, id, parsed.data);
    revalidatePath(`/${locale}/documents/${entity}`, 'page');
    revalidatePath(`/${locale}/documents/${entity}/${id}`, 'page');
    return { ok: true, data: updated };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateAndPostDocumentRecord(
  locale: string,
  entity: string,
  id: string,
  values: Record<string, unknown>,
): Promise<ActionResult> {
  const config = resolveConfig(entity);
  if (!config) return { ok: false, formError: 'notFound' };
  try {
    const ctx = await requireTenantContext();
    const parsed = buildZodSchema(headerAsCatalog(config), config.lines).safeParse(values);
    if (!parsed.success) {
      return { ok: false, fieldErrors: mapFieldErrors(parsed.error.flatten().fieldErrors) };
    }
    await updateDocument(ctx, config, id, parsed.data);
    try {
      await postDocument(ctx, config, id);
    } catch (error) {
      revalidatePath(`/${locale}/documents/${entity}`, 'page');
      revalidatePath(`/${locale}/documents/${entity}/${id}`, 'page');
      return mapError(error);
    }
    fireAfterPost(ctx, config, id);
    revalidatePath(`/${locale}/documents/${entity}`, 'page');
    revalidatePath(`/${locale}/documents/${entity}/${id}`, 'page');
    revalidatePath(`/${locale}/dashboard`, 'page');
    return { ok: true, data: { id }, redirectTo: `/${locale}/documents/${entity}` };
  } catch (error) {
    return mapError(error);
  }
}

export async function deleteDocumentRecord(
  locale: string,
  entity: string,
  id: string,
): Promise<ActionResult> {
  const config = resolveConfig(entity);
  if (!config) return { ok: false, formError: 'notFound' };
  try {
    const ctx = await requireTenantContext();
    await deleteDocument(ctx, config, id);
    revalidatePath(`/${locale}/documents/${entity}`, 'page');
    return { ok: true, data: { id }, redirectTo: `/${locale}/documents/${entity}` };
  } catch (error) {
    return mapError(error);
  }
}

export async function postDocumentRecord(
  locale: string,
  entity: string,
  id: string,
): Promise<ActionResult> {
  const config = resolveConfig(entity);
  if (!config) return { ok: false, formError: 'notFound' };
  try {
    const ctx = await requireTenantContext();
    const result = await postDocument(ctx, config, id);
    fireAfterPost(ctx, config, id);
    revalidatePath(`/${locale}/documents/${entity}`, 'page');
    revalidatePath(`/${locale}/documents/${entity}/${id}`, 'page');
    return { ok: true, data: result };
  } catch (error) {
    return mapError(error);
  }
}

export async function unpostDocumentRecord(
  locale: string,
  entity: string,
  id: string,
): Promise<ActionResult> {
  const config = resolveConfig(entity);
  if (!config) return { ok: false, formError: 'notFound' };
  try {
    const ctx = await requireTenantContext();
    const result = await unpostDocument(ctx, config, id);
    revalidatePath(`/${locale}/documents/${entity}`, 'page');
    revalidatePath(`/${locale}/documents/${entity}/${id}`, 'page');
    return { ok: true, data: result };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateDateOnPostedDocument(
  locale: string,
  entity: string,
  id: string,
  newDate: string | Date,
): Promise<ActionResult> {
  const config = resolveConfig(entity);
  if (!config) return { ok: false, formError: 'notFound' };
  const parsed =
    typeof newDate === 'string' ? new Date(newDate) : newDate instanceof Date ? newDate : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return { ok: false, fieldErrors: { date: ['invalid'] } };
  }
  try {
    const ctx = await requireTenantContext();
    try {
      await unpostDocument(ctx, config, id);
      await updateDocument(ctx, config, id, { date: parsed });
      await postDocument(ctx, config, id);
    } catch (error) {
      revalidatePath(`/${locale}/documents/${entity}`, 'page');
      revalidatePath(`/${locale}/documents/${entity}/${id}`, 'page');
      return mapError(error);
    }
    revalidatePath(`/${locale}/documents/${entity}`, 'page');
    revalidatePath(`/${locale}/documents/${entity}/${id}`, 'page');
    revalidatePath(`/${locale}/dashboard`, 'page');
    return { ok: true, data: { id } };
  } catch (error) {
    return mapError(error);
  }
}

function mapFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [name, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) out[name] = messages;
  }
  return out;
}

function mapError(error: unknown): ActionResult {
  if (error instanceof PermissionDeniedError) {
    return { ok: false, formError: 'permissionDenied' };
  }
  if (error instanceof NotFoundError) {
    return { ok: false, formError: 'notFound' };
  }
  if (error instanceof InvalidStatusError) {
    return { ok: false, formError: 'invalidStatus' };
  }
  if (error instanceof PostingValidationError) {
    return { ok: false, formError: error.reason };
  }
  if (error instanceof PeriodClosedError) {
    return { ok: false, formError: 'periodClosed' };
  }
  if (error instanceof PlanLimitError) {
    // Server actions can't set HTTP status, so surface the limit kind as the
    // form-error code; the route-level API (mobile) handles 402 separately.
    return { ok: false, formError: `planLimit.${error.kind}` };
  }
  if (error instanceof Error) {
    return { ok: false, formError: error.message };
  }
  return { ok: false, formError: 'errorGeneric' };
}

export async function cloneDocumentRecord(
  locale: string,
  entity: string,
  id: string,
): Promise<ActionResult> {
  const config = resolveConfig(entity);
  if (!config) return { ok: false, formError: 'notFound' };
  try {
    const ctx = await requireTenantContext();
    // getDocument returns header + lines; strip engine-managed fields so
    // createDocument allocates a new id/number/status/sequence.
    const source = (await getDocument(ctx, config, id)) as Record<string, unknown>;
    const {
      id: _id,
      number: _number,
      status: _status,
      postedAt: _postedAt,
      postedBy: _postedBy,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      deletedAt: _deletedAt,
      version: _version,
      tenantId: _tenantId,
      ...rest
    } = source;
    const created = (await createDocument(ctx, config, rest)) as { id: string };
    revalidatePath(`/${locale}/documents/${entity}`, 'page');
    return {
      ok: true,
      data: created,
      redirectTo: `/${locale}/documents/${entity}/${created.id}`,
    };
  } catch (error) {
    return mapError(error);
  }
}

export type BulkDocumentActionResult =
  | { ok: true; successCount: number; failedIds: string[] }
  | { ok: false; formError: string };

export async function bulkDeleteDocuments(
  locale: string,
  entity: string,
  ids: string[],
): Promise<BulkDocumentActionResult> {
  const config = resolveConfig(entity);
  if (!config) return { ok: false, formError: 'notFound' };
  try {
    const ctx = await requireTenantContext();
    let successCount = 0;
    const failedIds: string[] = [];
    for (const id of ids) {
      try {
        await deleteDocument(ctx, config, id);
        successCount++;
      } catch {
        failedIds.push(id);
      }
    }
    revalidatePath(`/${locale}/documents/${entity}`, 'page');
    return { ok: true, successCount, failedIds };
  } catch (error) {
    return bulkMapError(error);
  }
}

function bulkMapError(error: unknown): { ok: false; formError: string } {
  if (error instanceof PermissionDeniedError) return { ok: false, formError: 'permissionDenied' };
  if (error instanceof NotFoundError) return { ok: false, formError: 'notFound' };
  if (error instanceof Error) return { ok: false, formError: error.message };
  return { ok: false, formError: 'errorGeneric' };
}

export async function sendInvoiceEmailAction(invoiceId: string): Promise<ActionResult> {
  try {
    const ctx = await requireTenantContext();
    if (!hasPermission(ctx.permissions, 'sales.invoice:send_email')) {
      return { ok: false, formError: 'permissionDenied' };
    }
    // Ownership gate: getDocument runs through withTenant + RLS and throws
    // NotFoundError when invoiceId belongs to another tenant — prevents the
    // dispatcher from being used as a cross-tenant phishing relay.
    const config = resolveConfig('sales.invoice');
    if (!config) return { ok: false, formError: 'notFound' };
    const doc = (await getDocument(ctx, config, invoiceId)) as { status?: string } | null;
    if (!doc) return { ok: false, formError: 'notFound' };
    if (doc.status !== 'POSTED') return { ok: false, formError: 'invalidStatus' };

    await dispatchInvoiceSent(ctx.tenant.id, invoiceId);
    return { ok: true, data: { id: invoiceId } };
  } catch (error) {
    return mapError(error);
  }
}

export async function bulkPostDocuments(
  locale: string,
  entity: string,
  ids: string[],
): Promise<BulkDocumentActionResult> {
  const config = resolveConfig(entity);
  if (!config) return { ok: false, formError: 'notFound' };
  try {
    const ctx = await requireTenantContext();
    let successCount = 0;
    const failedIds: string[] = [];
    for (const id of ids) {
      try {
        await postDocument(ctx, config, id);
        successCount++;
        fireAfterPost(ctx, config, id);
      } catch {
        failedIds.push(id);
      }
    }
    revalidatePath(`/${locale}/documents/${entity}`, 'page');
    return { ok: true, successCount, failedIds };
  } catch (error) {
    return bulkMapError(error);
  }
}
