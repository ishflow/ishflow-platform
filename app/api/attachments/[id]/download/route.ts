import '@/configs';
import { signGetUrl } from '@/lib/r2';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getAttachment } from '@/platform/engine';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctxArg: { params: Promise<{ id: string }> }) {
  const { id } = await ctxArg.params;
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return new NextResponse('unauthorized', { status: 401 });
  }

  const row = await withTenant(ctx.tenant.id, (tx) => getAttachment(tx, ctx.tenant.id, id));
  if (!row) return new NextResponse('not found', { status: 404 });

  // ?inline=1 lets the in-app viewer render PDFs / images directly via
  // iframe / <img>. Without it the signed URL ships
  // `Content-Disposition: attachment` and the browser force-downloads.
  const params = new URL(req.url).searchParams;
  const inline = params.get('inline') === '1';
  const url = await signGetUrl(row.objectKey, {
    filename: row.filename,
    disposition: inline ? 'inline' : 'attachment',
  });
  // ?json=1 returns the signed URL as JSON instead of a 302. Chrome's PDF
  // viewer is unreliable when an iframe follows a same-origin → R2 redirect
  // (broken-document icon); fetching the URL once and binding it directly
  // to the iframe avoids the hop.
  if (params.get('json') === '1') {
    return NextResponse.json({ url });
  }
  return NextResponse.redirect(url, 302);
}
