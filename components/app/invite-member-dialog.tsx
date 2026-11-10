'use client';

import { inviteMemberAction } from '@/app/[locale]/(app)/admin/members/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SYSTEM_ROLE_DEFS, type SystemRoleName } from '@/platform/auth/seed-system-roles';
import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INVITABLE_ROLES = (Object.keys(SYSTEM_ROLE_DEFS) as SystemRoleName[]).filter(
  (r) => r !== 'owner',
);

const DEFAULT_ROLE: SystemRoleName = 'sales';

export function InviteMemberDialog() {
  const t = useTranslations('admin.members');
  const tRoles = useTranslations('roleLabels');
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [systemRole, setSystemRole] = useState<SystemRoleName>(DEFAULT_ROLE);

  const roleItems = INVITABLE_ROLES.map((r) => ({ value: r, label: tRoles(r) }));
  const [result, setResult] = useState<{ ok: false; error: string } | { ok: true } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isValid = EMAIL_REGEX.test(email.trim());

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValid || isPending) return;

    const formData = new FormData();
    formData.set('email', email.trim());
    formData.set('systemRole', systemRole);

    startTransition(async () => {
      const res = await inviteMemberAction(formData);
      setResult(res);
      if (res.ok) {
        setEmail('');
        setSystemRole(DEFAULT_ROLE);
        setTimeout(() => setOpen(false), 1500);
      }
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setEmail('');
      setSystemRole(DEFAULT_ROLE);
      setResult(null);
    }
  }

  const errorMessage =
    result && !result.ok
      ? result.error === 'invalid_email'
        ? t('inviteErrorInvalidEmail')
        : result.error === 'already_member'
          ? t('inviteErrorAlreadyMember')
          : t('inviteErrorClerk')
      : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm">
            <UserPlus />
            {t('invite')}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('inviteTitle')}</DialogTitle>
          <DialogDescription>{t('inviteDescription')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">{t('inviteEmailLabel')}</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              placeholder={t('inviteEmailPlaceholder')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (result) setResult(null);
              }}
              disabled={isPending}
              aria-invalid={errorMessage ? 'true' : undefined}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-role">{t('inviteRoleLabel')}</Label>
            <Select
              items={roleItems}
              value={systemRole}
              onValueChange={(v) => {
                if (v) setSystemRole(v as SystemRoleName);
              }}
            >
              <SelectTrigger id="invite-role" className="w-full" disabled={isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
            {result?.ok && (
              <p className="text-sm text-green-600 dark:text-green-400">{t('inviteSent')}</p>
            )}
            <p className="text-xs text-muted-foreground">{t('inviteHelp')}</p>
          </div>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={isPending}>
                  {t('inviteCancel')}
                </Button>
              }
            />
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? t('inviteSending') : t('inviteSubmit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
