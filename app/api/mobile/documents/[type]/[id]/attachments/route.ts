import '@/configs/purchases/documents/purchase-invoice';
import '@/configs/sales/documents/sales-invoice';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { listAttachments } from '@/platform/engine/attachments';
import { signGetUrl } from '@/lib/r2';
import { DocumentTypeParamSchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ type: string; id: string }> },
): Promise<Response> {
  const { type, id } = await ctx.params;
  const parsed = DocumentTypeParamSchema.safeParse(type);
  if (!parsed.success) return NextResponse.json({ error: 'invalid type' }, { status: 400 });

  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Entity string format matches platform/engine/attachments.ts (e.g. "document.purchases.invoice")
  const entity = `document.${parsed.data}`;

  const rows = await withTenant(app.tenant.id, (tx) =>
    listAttachments(tx, app.tenant.id, entity, id),
  );

  const attachments = await Promise.all(
    rows.map(async (row) => {
      let signedUrl: string | null = null;
      try {
        signedUrl = await signGetUrl(row.objectKey, { filename: row.filename });
      } catch {
        // R2 may not be configured in dev — non-fatal
      }
      return {
        id: row.id,
        fileName: row.filename,
        sizeBytes: row.size,
        createdAt: row.createdAt.toISOString(),
        signedUrl,
      };
    }),
  );

  return NextResponse.json({ attachments });
}
