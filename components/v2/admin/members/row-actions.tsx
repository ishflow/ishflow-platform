'use client';

import {
  cancelInvitationAction,
  removeAdminMemberAction,
  resendInvitationAction,
  setMemberRoleAction,
} from '@/app/[locale]/(app)/admin/members/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, useState, useTransition } from 'react';

export function MemberRowMenu({
  membershipId,
  isYou,
  removeLabel,
  removeConfirm,
  menuAria,
}: {
  membershipId: string;
  isYou?: boolean;
  removeLabel: string;
  removeConfirm: string;
  menuAria: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm(removeConfirm)) return;
    startTransition(async () => {
      await removeAdminMemberAction(membershipId);
      router.refresh();
    });
  }

  // The signed-in owner cannot remove themselves here.
  if (isYou) {
    return (
      <button type="button" className="row-menu" aria-label={menuAria} disabled>
        <MoreHorizontal size={14} strokeWidth={1.75} />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" className="row-menu" aria-label={menuAria} disabled={pending}>
            <MoreHorizontal size={14} strokeWidth={1.75} />
          </button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={remove} disabled={pending}>
          <Trash2 className="mr-2 size-4" />
          {removeLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InviteRowActions({
  invitationId,
  email,
  systemRole,
  resendLabel,
  cancelAria,
}: {
  invitationId: string;
  email: string;
  systemRole: string;
  resendLabel: string;
  cancelAria: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function resend() {
    startTransition(async () => {
      await resendInvitationAction(invitationId, email, systemRole);
      router.refresh();
    });
  }

  function cancel() {
    startTransition(async () => {
      await cancelInvitationAction(invitationId);
      router.refresh();
    });
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button type="button" className="btn btn-ghost btn-sm" onClick={resend} disabled={pending}>
        {resendLabel}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        aria-label={cancelAria}
        onClick={cancel}
        disabled={pending}
      >
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}

/**
 * Per-row role selector (admins only). Replaces the member's role with the
 * chosen one via `setMemberRoleAction`. The owner row never renders this (its
 * role id is absent from the assignable options), so ownership can't be
 * changed here.
 */
export function MemberRoleSelect({
  membershipId,
  currentRoleId,
  options,
  ariaLabel,
}: {
  membershipId: string;
  currentRoleId: string;
  options: Array<{ id: string; name: string; label: string }>;
  ariaLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function onChange(e: ChangeEvent<HTMLSelectElement>) {
    const roleId = e.target.value;
    if (roleId === currentRoleId) return;
    setFailed(false);
    startTransition(async () => {
      const res = await setMemberRoleAction(membershipId, roleId);
      if (res.ok) {
        router.refresh();
      } else {
        setFailed(true);
      }
    });
  }

  return (
    <select
      className="input"
      style={{ width: 'auto', minWidth: 130, padding: '4px 8px', fontSize: 13 }}
      aria-label={ariaLabel}
      value={currentRoleId}
      onChange={onChange}
      disabled={pending}
      data-error={failed || undefined}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
