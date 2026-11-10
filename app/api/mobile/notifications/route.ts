import { requireTenantContext } from '@/platform/auth/current-context';
import {
  NotificationListQuerySchema,
  NotificationListResponseSchema,
} from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  try {
    await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = NotificationListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!q.success) {
    return NextResponse.json({ error: 'invalid query' }, { status: 400 });
  }

  const body = NotificationListResponseSchema.parse({
    items: [],
    total: 0,
    page: q.data.page,
    pageSize: q.data.pageSize,
  });
  return NextResponse.json(body);
}
