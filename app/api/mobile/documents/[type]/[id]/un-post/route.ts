import '@/configs/purchases/documents/payment-sent';
import '@/configs/purchases/documents/purchase-invoice';
import '@/configs/sales/documents/payment-received';
import '@/configs/sales/documents/sales-invoice';

import { requireTenantContext } from '@/platform/auth/current-context';
import { unpostDocument } from '@/platform/engine';
import { getRegistry } from '@/platform/metadata';
import { DocumentTypeParamSchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ type: string; id: string }> },
): Promise<Response> {
  const { type, id } = await ctx.params;
  const parsed = DocumentTypeParamSchema.safeParse(type);
  if (!parsed.success) return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  const config = getRegistry().document[parsed.data];
  if (!config) return NextResponse.json({ error: 'unknown type' }, { status: 404 });

  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await unpostDocument(app, config, id);
  return NextResponse.json({ movementCount: result.deactivatedCount });
}
