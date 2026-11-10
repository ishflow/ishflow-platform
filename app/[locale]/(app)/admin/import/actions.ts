'use server';

import { requireTenantContext } from '@/platform/auth/current-context';
import { hasPermission } from '@/platform/engine/permissions';
import {
  ENTITY_TYPES,
  type ImportEntity,
  type ImportResult,
  parseUpload,
  runImport,
} from '@/platform/import';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function assertPermission(ctx: Awaited<ReturnType<typeof requireTenantContext>>): void {
  if (!hasPermission(ctx.permissions, 'admin.organization:edit')) {
    throw new Error('permission denied: admin.organization:edit required');
  }
}

export async function parseUploadAction(file: File): Promise<{
  headers: string[];
  rows: Record<string, string>[];
  errors: Array<{ code: string; message: string }>;
}> {
  const ctx = await requireTenantContext();
  assertPermission(ctx);

  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`file too big: ${file.size} > 5 MB`);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const out = await parseUpload(buf, file.name);
  return {
    headers: out.headers,
    rows: out.rows,
    errors: out.errors.map((e) => ({ code: e.code, message: e.message })),
  };
}

export async function runImportAction(input: {
  entity: ImportEntity;
  rows: Record<string, unknown>[];
}): Promise<ImportResult> {
  const ctx = await requireTenantContext();
  assertPermission(ctx);
  if (!ENTITY_TYPES.includes(input.entity)) {
    throw new Error(`unknown entity: ${input.entity}`);
  }
  return runImport(ctx, input.entity, input.rows);
}
