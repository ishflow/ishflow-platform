import '@/configs';

import { requireTenantContext } from '@/platform/auth/current-context';
import { searchReference } from '@/platform/engine';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const module = searchParams.get('module') ?? '';
  const name = searchParams.get('name') ?? '';
  const query = searchParams.get('q') ?? '';
  const limit = Number(searchParams.get('limit') ?? '20');
  if (!module || !name) {
    return NextResponse.json({ error: 'module and name are required' }, { status: 400 });
  }
  const filter: Record<string, string> = {};
  for (const [k, v] of searchParams.entries()) {
    if (k.startsWith('filter.')) filter[k.slice('filter.'.length)] = v;
  }
  const ctx = await requireTenantContext();
  const rows = await searchReference({
    ctx,
    module,
    name,
    query,
    limit: Number.isFinite(limit) ? limit : 20,
    filter,
  });
  return NextResponse.json(rows);
}
