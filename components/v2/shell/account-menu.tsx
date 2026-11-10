'use client';

import { leaveOrgAction, switchTenantAction } from '@/app/[locale]/(app)/_switch-tenant';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { defaultLocale } from '@/platform/i18n/config';
import { useRouter } from '@/platform/i18n/navigation';
import { useClerk } from '@clerk/nextjs';
import { Check, LogOut, Settings, Shield, User, UserMinus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

export type TenantOption = { id: string; name: string; clerkOrgId?: string | null };

/**
 * Account menu opened from the top-right avatar pill: profile / settings /
 * super-admin (owner-only) / organization switch / sign out. This is the single
 * account surface in the shell — the old bottom-left footer widget was removed.
 */
export function AccountMenu({
  userName,
  userEmail,
  userInitials,
  activeTenantId,
  tenants,
  isPlatformAdmin,
  roleLabel = '',
}: {
  userName: string;
  userEmail: string;
  userInitials: string;
  activeTenantId: string;
  tenants: TenantOption[];
  isPlatformAdmin: boolean;
  /** Translated role label for the active org (e.g. "Depocu"). */
  roleLabel?: string;
}) {
  const t = useTranslations('v2_nav.account');
  const locale = useLocale();
  const router = useRouter();
  const { signOut, setActive } = useClerk();
  const [pending, startTransition] = useTransition();

  const activeName = tenants.find((x) => x.id === activeTenantId)?.name ?? '';

  function switchTo(tn: TenantOption) {
    if (tn.id === activeTenantId || pending) return;
    startTransition(async () => {
      // Switch the Clerk session's active org FIRST: on web the session's
      // active org takes precedence over the `activeTenantId` metadata in
      // resolveContext, so a metadata-only switch would be silently ignored.
      // For a DB-only tenant (no Clerk org) we CLEAR the active org (null) so
      // resolveContext falls through to the activeTenantId metadata path.
      if (setActive) {
        try {
          await setActive({ organization: tn.clerkOrgId ?? null });
        } catch {
          /* fall through — switchTenantAction still updates the metadata */
        }
      }
      const res = await switchTenantAction(tn.id);
      if (res.ok) {
        // Full navigation so the (app) layout re-resolves with the new tenant.
        const href = locale === defaultLocale ? '/dashboard' : `/${locale}/dashboard`;
        window.location.assign(href);
      }
    });
  }

  function leave() {
    if (pending || !window.confirm(t('leaveOrgConfirm'))) return;
    startTransition(async () => {
      const res = await leaveOrgAction();
      if (res.ok) {
        // Full navigation — the (app) layout re-resolves to the next tenant
        // (or routes to onboarding when the user has none left).
        const href = locale === defaultLocale ? '/dashboard' : `/${locale}/dashboard`;
        window.location.assign(href);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="avatar-pill"
            aria-label={t('menuAria')}
            disabled={pending}
            style={{ border: 'none', padding: 0, font: 'inherit' }}
          >
            {userInitials || 'U'}
          </button>
        }
      />
      <DropdownMenuContent align="end" side="bottom" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="truncate text-sm font-semibold text-foreground">{userName}</div>
            <div className="truncate text-xs font-normal text-muted-foreground">{userEmail}</div>
            {activeName || roleLabel ? (
              <div className="truncate pt-1 text-xs font-normal text-muted-foreground">
                {[activeName, roleLabel].filter(Boolean).join(' · ')}
              </div>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
          <User className="mr-2 size-4" />
          {t('profile')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/settings/general')}>
          <Settings className="mr-2 size-4" />
          {t('settings')}
        </DropdownMenuItem>
        {isPlatformAdmin ? (
          <DropdownMenuItem onClick={() => router.push('/super-admin')}>
            <Shield className="mr-2 size-4" />
            {t('superAdmin')}
          </DropdownMenuItem>
        ) : null}
        {tenants.length > 1 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t('switchOrg')}</DropdownMenuLabel>
              {tenants.map((tn) => (
                <DropdownMenuItem key={tn.id} onClick={() => switchTo(tn)} disabled={pending}>
                  <span className="flex-1 truncate">{tn.name}</span>
                  {tn.id === activeTenantId ? <Check className="ml-2 size-4 shrink-0" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        ) : null}
        <DropdownMenuSeparator />
        {tenants.length > 0 ? (
          <DropdownMenuItem onClick={leave} disabled={pending}>
            <UserMinus className="mr-2 size-4" />
            {t('leaveOrg')}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => {
            void signOut({ redirectUrl: '/sign-in' });
          }}
        >
          <LogOut className="mr-2 size-4" />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
