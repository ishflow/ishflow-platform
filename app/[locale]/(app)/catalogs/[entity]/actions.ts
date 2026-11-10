'use server';

import '@/configs';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import {
  NotFoundError,
  PermissionDeniedError,
  buildZodSchema,
  createRecord,
  deleteRecord,
  listRecordsPaged,
  updateRecord,
} from '@/platform/engine';
import { validatePriceTypeWrite } from '@/platform/engine/price-type-validate';
import { getRegistry } from '@/platform/metadata';
import type { CatalogConfig } from '@/platform/metadata';
import type { ActionResult } from '@/platform/ui';
import ExcelJS from 'exceljs';
import { revalidatePath } from 'next/cache';
import { extractPrismaUniqueField } from './unique-field';

async function checkPriceTypeCoherence(
  entity: string,
  tenantId: string,
  values: Record<string, unknown>,
  currentId: string | null,
): Promise<string | null> {
  if (entity !== 'sales.price_type') return null;
  return withTenant(tenantId, async (tx) => {
    const bag = tx as {
      catalog_sales_price_type: {
        findUnique: (a: unknown) => Promise<{ basePriceType: string | null } | null>;
      };
    };
    return validatePriceTypeWrite(
      async (id) =>
        bag.catalog_sales_price_type.findUnique({
          where: { id },
          select: { basePriceType: true },
        }),
      values as { kind?: unknown; basePriceType?: unknown; markupPct?: unknown },
      currentId,
    );
  });
}

/**
 * Resolve a catalog config or signal a not-found result without throwing —
 * server actions return structured errors; callers surface `formError` in UI.
 */
function resolveConfig(entity: string) {
  return getRegistry().catalog[entity];
}

export async function createCatalogRecord(
  locale: string,
  entity: string,
  values: Record<string, unknown>,
  force = false,
): Promise<ActionResult> {
  const config = resolveConfig(entity);
  if (!config) return { ok: false, formError: 'notFound' };
  try {
    const ctx = await requireTenantContext();
    const parsed = buildZodSchema(config).safeParse(values);
    if (!parsed.success) {
      return { ok: false, fieldErrors: flattenZod(parsed.error.flatten().fieldErrors) };
    }
    // M5 (design D6): soft duplicate-name warning. When the config opts in via
    // `warnDuplicateField` and an active record already has the same value,
    // return a recoverable `warning` so the form can prompt "create anyway?".
    // `force` (from the confirm re-submit) skips the check. SKU stays unique.
    if (!force && config.warnDuplicateField) {
      const dupField = config.warnDuplicateField;
      const dupValue = parsed.data[dupField];
      if (typeof dupValue === 'string' && dupValue.trim()) {
        const { total } = await listRecordsPaged(ctx, config, {
          where: { [dupField]: dupValue },
          pageSize: 1,
        });
        if (total > 0) return { ok: false, warning: 'duplicateName' };
      }
    }
    const coherenceError = await checkPriceTypeCoherence(
      entity,
      ctx.tenant?.id ?? '',
      parsed.data,
      null,
    );
    if (coherenceError) {
      return { ok: false, formError: coherenceError };
    }
    const created = await createRecord(ctx, config, parsed.data);
    revalidatePath(`/${locale}/catalogs/${entity}`, 'page');
    revalidatePath(`/${locale}/dashboard`, 'page');
    return { ok: true, data: created, redirectTo: `/${locale}/catalogs/${entity}` };
  } catch (error) {
    return mapError(error, config);
  }
}

export async function updateCatalogRecord(
  locale: string,
  entity: string,
  id: string,
  values: Record<string, unknown>,
): Promise<ActionResult> {
  const config = resolveConfig(entity);
  if (!config) return { ok: false, formError: 'notFound' };
  try {
    const ctx = await requireTenantContext();
    const parsed = buildZodSchema(config).safeParse(values);
    if (!parsed.success) {
      return { ok: false, fieldErrors: flattenZod(parsed.error.flatten().fieldErrors) };
    }
    const coherenceError = await checkPriceTypeCoherence(
      entity,
      ctx.tenant?.id ?? '',
      parsed.data,
      id,
    );
    if (coherenceError) {
      return { ok: false, formError: coherenceError };
    }
    const updated = await updateRecord(ctx, config, id, parsed.data);
    revalidatePath(`/${locale}/catalogs/${entity}`, 'page');
    revalidatePath(`/${locale}/catalogs/${entity}/${id}`, 'page');
    revalidatePath(`/${locale}/dashboard`, 'page');
    return { ok: true, data: updated };
  } catch (error) {
    return mapError(error, config);
  }
}

export async function deleteCatalogRecord(
  locale: string,
  entity: string,
  id: string,
): Promise<ActionResult> {
  const config = resolveConfig(entity);
  if (!config) return { ok: false, formError: 'notFound' };
  try {
    const ctx = await requireTenantContext();
    await deleteRecord(ctx, config, id);
    revalidatePath(`/${locale}/catalogs/${entity}`, 'page');
    revalidatePath(`/${locale}/dashboard`, 'page');
    return { ok: true, data: { id }, redirectTo: `/${locale}/catalogs/${entity}` };
  } catch (error) {
    return mapError(error, config);
  }
}

// Extends ActionResult with per-row error telemetry — BulkActionResult below is only for
// bulk-delete which has no per-row identifier the user typed.
export type BulkProductResult = ActionResult & {
  createdCount: number;
  errors: Array<{ row: number; name: string; message: string }>;
};

function mapBulkRowMessage(error: unknown, config: CatalogConfig): string {
  if (error instanceof PermissionDeniedError) return 'permissionDenied';
  if (error instanceof NotFoundError) return 'notFound';
  const uniqueField = extractPrismaUniqueField(error, config);
  if (uniqueField) return 'fieldErrorUnique';
  return error instanceof Error ? error.message : 'unknown';
}

export async function createProductsBulk(
  locale: string,
  names: string[],
): Promise<BulkProductResult> {
  const config = resolveConfig('inventory.product');
  if (!config) {
    return { ok: false, formError: 'notFound', createdCount: 0, errors: [] };
  }
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return { ok: false, formError: 'unauthorized', createdCount: 0, errors: [] };
  }

  const errors: Array<{ row: number; name: string; message: string }> = [];
  let createdCount = 0;
  for (let i = 0; i < names.length; i++) {
    const raw = names[i] ?? '';
    const name = raw.trim();
    if (!name) continue;
    try {
      const parsed = buildZodSchema(config).safeParse({ name });
      if (!parsed.success) {
        const firstFieldError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
        errors.push({ row: i, name, message: firstFieldError ?? 'invalid' });
        continue;
      }
      await createRecord(ctx, config, parsed.data);
      createdCount++;
    } catch (error) {
      errors.push({
        row: i,
        name,
        message: mapBulkRowMessage(error, config),
      });
    }
  }

  revalidatePath(`/${locale}/catalogs/inventory.product`, 'page');
  revalidatePath(`/${locale}/dashboard`, 'page');

  return {
    ok: true,
    data: { createdCount, errors },
    createdCount,
    errors,
    redirectTo: createdCount > 0 ? `/${locale}/catalogs/inventory.product` : undefined,
  };
}

export async function parseProductsXlsx(
  formData: FormData,
): Promise<{ ok: true; names: string[] } | { ok: false; formError: string }> {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, formError: 'noFile' };
  }
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return { ok: false, formError: 'invalidXlsx' };
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) return { ok: false, formError: 'emptyWorkbook' };

  const names: string[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
    if (rowIndex === 1) return;
    const cellValue = row.getCell(1).value;
    if (cellValue == null) return;
    const s = String(cellValue).trim();
    if (s) names.push(s);
  });

  return { ok: true, names };
}

function flattenZod(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [name, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) out[name] = messages;
  }
  return out;
}

function mapError(error: unknown, config?: CatalogConfig): ActionResult {
  if (error instanceof PermissionDeniedError) {
    return { ok: false, formError: 'permissionDenied' };
  }
  if (error instanceof NotFoundError) {
    return { ok: false, formError: 'notFound' };
  }
  const uniqueField = extractPrismaUniqueField(error, config);
  if (uniqueField) {
    const fieldMeta = config?.fields[uniqueField];
    if (fieldMeta?.formHidden) {
      return { ok: false, formError: 'errorGeneric' };
    }
    return { ok: false, fieldErrors: { [uniqueField]: ['fieldErrorUnique'] } };
  }
  if (error instanceof Error) {
    return { ok: false, formError: error.message };
  }
  return { ok: false, formError: 'errorGeneric' };
}

export type BulkActionResult =
  | { ok: true; successCount: number; failedIds: string[] }
  | { ok: false; formError: string };

export async function bulkDeleteCatalogRecords(
  locale: string,
  entity: string,
  ids: string[],
): Promise<BulkActionResult> {
  const config = resolveConfig(entity);
  if (!config) return { ok: false, formError: 'notFound' };
  try {
    const ctx = await requireTenantContext();
    let successCount = 0;
    const failedIds: string[] = [];
    for (const id of ids) {
      try {
        await deleteRecord(ctx, config, id);
        successCount++;
      } catch {
        failedIds.push(id);
      }
    }
    revalidatePath(`/${locale}/catalogs/${entity}`, 'page');
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
