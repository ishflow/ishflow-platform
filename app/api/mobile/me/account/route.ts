import { resolveContext } from '@/platform/auth/current-context';
import { DeleteAccountError, deleteUserAccount } from '@/platform/auth/delete-account';
import { DeleteAccountResponseSchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(): Promise<Response> {
  const ctx = await resolveContext();
  if (!ctx) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await deleteUserAccount({ userId: ctx.user.id });
    const body = DeleteAccountResponseSchema.parse({
      deletedAt: result.deletedAt.toISOString(),
    });
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof DeleteAccountError) {
      if (error.code === 'sole_owner_of_tenants') {
        return NextResponse.json(
          { error: 'sole_owner_of_tenant', tenantIds: error.tenantIds },
          { status: 409 },
        );
      }
      if (error.code === 'user_not_found') {
        return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
      }
    }
    throw error;
  }
}
