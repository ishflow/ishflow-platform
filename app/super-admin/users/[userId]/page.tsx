import { UserActionsCard } from '@/components/app/super-admin/users/user-actions-card';
import { UserAuditCard } from '@/components/app/super-admin/users/user-audit-card';
import { UserIdentityCard } from '@/components/app/super-admin/users/user-identity-card';
import { UserMembershipsCard } from '@/components/app/super-admin/users/user-memberships-card';
import { UserPushTokensCard } from '@/components/app/super-admin/users/user-push-tokens-card';
import { UserSessionsCard } from '@/components/app/super-admin/users/user-sessions-card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { getSuperAdminProDict } from '@/platform/super-admin/pro-messages';
import { loadUserDetail } from '@/platform/super-admin/user-detail/load-user-detail';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  requestPasswordReset,
  revokeAllSessions,
  revokeOneSession,
  softDeleteUser,
} from './actions';

export const dynamic = 'force-dynamic';

export default async function SuperAdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const [user, baseDict, proDict] = await Promise.all([
    loadUserDetail(userId),
    getSuperAdminDict(),
    getSuperAdminProDict(),
  ]);
  if (!user) notFound();

  const d = proDict.users.detail;
  const dash = baseDict.common.dash;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/super-admin/users"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-fit -ml-2')}
        >
          {d.back}
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{d.title}</h1>
          <p className="text-sm text-muted-foreground">{d.subtitle}</p>
        </div>
      </header>

      <UserIdentityCard user={user} dict={d} dash={dash} />

      <UserMembershipsCard
        memberships={user.memberships}
        dict={d.memberships}
        emptyText={d.memberships.empty}
      />

      <UserAuditCard rows={user.recentAudit} dict={d.audit} dash={dash} />

      <UserSessionsCard
        sessions={user.sessions}
        errorLoading={user.sessionsError}
        dict={d.sessions}
        errorLabel={baseDict.common.error}
        revokeOneAction={async (sessionId: string) => {
          'use server';
          return revokeOneSession(user.id, sessionId);
        }}
        revokeAllAction={async () => {
          'use server';
          return revokeAllSessions(user.id);
        }}
      />

      <UserPushTokensCard tokens={user.pushTokens} dict={d.pushTokens} dash={dash} />

      <UserActionsCard
        dict={d.actions}
        cancelLabel={baseDict.common.cancel}
        applyingLabel={baseDict.common.applying}
        passwordResetAction={async () => {
          'use server';
          return requestPasswordReset(user.id);
        }}
        softDeleteAction={async () => {
          'use server';
          return softDeleteUser(user.id);
        }}
        alreadyDeleted={user.deletedAt !== null}
      />
    </div>
  );
}
