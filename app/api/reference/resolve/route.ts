import '@/configs';

import { requireTenantContext } from '@/platform/auth/current-context';
import { resolveReference } from '@/platform/engine';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const module = searchParams.get('module') ?? '';
  const name = searchParams.get('name') ?? '';
  const id = searchParams.get('id') ?? '';
  if (!module || !name || !id) {
    return NextResponse.json({ error: 'module, name, and id are required' }, { status: 400 });
  }
  const filter: Record<string, string> = {};
  for (const [k, v] of searchParams.entries()) {
    if (k.startsWith('filter.')) filter[k.slice('filter.'.length)] = v;
  }
  const ctx = await requireTenantContext();
  const row = await resolveReference({ ctx, module, name, id, filter });
  return NextResponse.json(row);
}
