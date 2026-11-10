import { resolveContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { registerBalance } from '@/platform/engine';
import { hasPermission } from '@/platform/engine/permissions';
import { getRegistry } from '@/platform/metadata';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  if (!type || !id) {
    return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
  }

  if (type !== 'customer' && type !== 'supplier') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  const ctx = await resolveContext();
  if (!ctx || !ctx.tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Sales reps have no purchases.supplier:read; warehouse has no
  // sales.customer:read. Match the balance type to the right entity perm.
  const requiredPerm = type === 'customer' ? 'sales.customer:read' : 'purchases.supplier:read';
  if (!hasPermission(ctx.permissions, requiredPerm)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const registerId =
      type === 'customer' ? 'sales.accounts_receivable' : 'purchases.accounts_payable';

    const reg = getRegistry().register[registerId];
    if (!reg) {
      return NextResponse.json({ error: 'Register not found' }, { status: 500 });
    }

    const filterKey = type === 'customer' ? 'customer' : 'supplier';
    const { quantity: balance } = await withTenant(ctx.tenant.id, (tx) =>
      registerBalance(tx, reg, { [filterKey]: id }),
    );

    return NextResponse.json({
      balance,
      currency: ctx.tenant.currency,
    });
  } catch (error) {
    console.error('Partner balance error:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}
