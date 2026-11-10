'use server';

import { requireTenantContext } from '@/platform/auth/current-context';
import { hasPermission } from '@/platform/engine/permissions';
import {
  type ImportResult,
  type Imported1cRow,
  parse1cEnterpriseData,
  runImport,
} from '@/platform/import';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB — master-data XML is small

export type CounterpartyTarget = 'customers' | 'suppliers' | 'both';

export type Parse1cResult = {
  products: Imported1cRow[];
  counterparties: Imported1cRow[];
  warnings: string[];
};

export type Run1cImportResult = {
  product: ImportResult;
  customer: ImportResult | null;
  supplier: ImportResult | null;
};

const EMPTY: ImportResult = { inserted: 0, skipped: 0, errors: [] };

function assertPermission(ctx: Awaited<ReturnType<typeof requireTenantContext>>): void {
  if (!hasPermission(ctx.permissions, 'admin.organization:edit')) {
    throw new Error('permission denied: admin.organization:edit required');
  }
}

export async function parse1cUploadAction(file: File): Promise<Parse1cResult> {
  const ctx = await requireTenantContext();
  assertPermission(ctx);
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`file too big: ${file.size} > 10 MB`);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  return parse1cEnterpriseData(buf.toString('utf-8'));
}

export async function run1cImportAction(input: {
  products: Imported1cRow[];
  counterparties: Imported1cRow[];
  counterpartyTarget: CounterpartyTarget;
}): Promise<Run1cImportResult> {
  const ctx = await requireTenantContext();
  assertPermission(ctx);

  const product = input.products.length ? await runImport(ctx, 'product', input.products) : EMPTY;

  const wantCustomers =
    input.counterpartyTarget === 'customers' || input.counterpartyTarget === 'both';
  const wantSuppliers =
    input.counterpartyTarget === 'suppliers' || input.counterpartyTarget === 'both';

  const customer =
    wantCustomers && input.counterparties.length
      ? await runImport(ctx, 'customer', input.counterparties)
      : null;
  const supplier =
    wantSuppliers && input.counterparties.length
      ? await runImport(ctx, 'supplier', input.counterparties)
      : null;

  return { product, customer, supplier };
}
