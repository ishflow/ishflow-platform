import { signPutUrl } from '@/lib/r2';
import { requireTenantContext } from '@/platform/auth/current-context';
import { requireBranding } from '@/platform/billing/branding-gate';
import { PlanFeatureError } from '@/platform/billing/features';
import { hasPermission } from '@/platform/engine/permissions';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// SVG is intentionally excluded: it can carry inline <script>, and logos are
// served from the public bucket. Raster formats only. Finding E8.
const ALLOWED_EXTS = ['png', 'webp', 'jpeg', 'jpg'];
const ALLOWED_CONTENT_TYPES = ['image/png', 'image/webp', 'image/jpeg'];
const MAX_SIZE = 1 * 1024 * 1024;

function extFromFilename(name: string): string {
  const parts = name.split('.');
  return parts[parts.length - 1]?.toLowerCase() ?? '';
}

export async function POST(req: Request): Promise<Response> {
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!hasPermission(ctx.permissions, 'owner:branding')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    requireBranding(ctx.tenant);
  } catch (e) {
    if (e instanceof PlanFeatureError) return NextResponse.json(e.toJSON(), { status: 402 });
    throw e;
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const filename = typeof body.filename === 'string' ? body.filename : '';
  const contentType = typeof body.contentType === 'string' ? body.contentType : '';
  const size = typeof body.size === 'number' ? body.size : 0;

  if (!filename || filename.length > 255) {
    return NextResponse.json({ error: 'invalid_filename' }, { status: 400 });
  }
  if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'invalid_content_type' }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_SIZE) {
    return NextResponse.json({ error: 'invalid_size' }, { status: 400 });
  }

  const ext = extFromFilename(filename);
  if (!ALLOWED_EXTS.includes(ext)) {
    return NextResponse.json(
      { error: 'invalid_image', message: 'File must be PNG, SVG, WebP, or JPEG' },
      { status: 400 },
    );
  }

  const timestamp = Date.now();
  const objectKey = `tenant/${ctx.tenant.id}/branding/logo-${timestamp}.${ext}`;

  const uploadUrl = await signPutUrl(objectKey, contentType, size);
  const finalUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${objectKey}`;

  return NextResponse.json({ uploadUrl, finalUrl });
}
