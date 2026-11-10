import { resolveContext } from '@/platform/auth/current-context';
import { hasPermission } from '@/platform/engine/permissions';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE() {
  // Only the same owner/admin who set the cookie should be able to clear it.
  // Without this gate, a viewer with a stolen cookie could clear the
  // impersonation context to mask audit traces.
  const ctx = await resolveContext();
  if (!ctx || !hasPermission(ctx.permissions, '*:*')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const jar = await cookies();
  jar.delete('view-as-role');
  return NextResponse.json({ ok: true });
}
