import { resolveContext } from '@/platform/auth/current-context';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ProfileForm } from './profile-form';

// Capture first/last name + phone before the worker lands in their company.
// Server-guard: if all three are already set (e.g. an existing multi-company
// account, or a re-visit), skip straight to `/invite/done`. Unauthenticated
// visitors are bounced to the ticket-accept bridge.
export default async function InviteProfile() {
  const ctx = await resolveContext();
  if (!ctx) redirect('/invite/continue');

  const { firstName, lastName, phone } = ctx.user;
  if (firstName && lastName && phone) {
    redirect('/invite/done');
  }

  const t = await getTranslations('invite.profile');

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-center text-2xl font-semibold text-foreground">{t('title')}</h1>
      <ProfileForm defaultFirstName={firstName ?? ''} defaultLastName={lastName ?? ''} />
    </main>
  );
}
