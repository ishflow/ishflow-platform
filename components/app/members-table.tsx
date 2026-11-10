'use client';

import {
  removeAdminMemberAction,
  removeRoleAction,
} from '@/app/[locale]/(app)/admin/members/actions';
import { RoleCombobox } from '@/components/app/role-combobox';
import { TransferOwnershipModal } from '@/components/app/transfer-ownership-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type RoleOption = { id: string; name: string; isSystem: boolean };

type Member = {
  id: string;
  userId: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  roles: RoleOption[];
};

type MembersTableProps = {
  members: Member[];
  options: RoleOption[];
  callerId: string;
  canTransfer: boolean;
  canRemoveAdmin: boolean;
  assignRoleLabel: string;
  removeRoleLabel: string;
  transferLabel: string;
  removeAdminLabel: string;
  removeAdminDisabledLabel: string;
  ownerRemoveDisabledLabel: string;
  transferConfirmLabel: string;
  transferDescriptionLabel: string;
};

export function MembersTable({
  members,
  options,
  callerId,
  canTransfer,
  canRemoveAdmin,
  assignRoleLabel,
  removeRoleLabel,
  transferLabel,
  removeAdminLabel,
  removeAdminDisabledLabel,
  ownerRemoveDisabledLabel,
  transferConfirmLabel,
  transferDescriptionLabel,
}: MembersTableProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [targetMember, setTargetMember] = useState<Member | null>(null);
  const tRole = useTranslations('roleLabels');

  const filteredOptions = options.filter((o) => !(o.name === 'owner' && o.isSystem));

  function openTransfer(member: Member) {
    setTargetMember(member);
    setModalOpen(true);
  }

  async function handleTransfer() {
    if (!targetMember) return;
    const res = await fetch('/api/admin/tenant/transfer-ownership', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetMembershipId: targetMember.id,
        confirmation: 'TRANSFER',
      }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      const body = await res.text();
      alert(`Transfer failed: ${body}`);
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => {
            const isOwner = m.roles.some((r) => r.name === 'owner' && r.isSystem);
            const isAdmin = m.roles.some((r) => r.name === 'admin' && r.isSystem);
            const isCaller = m.userId === callerId;
            const showTransfer = canTransfer && !isCaller && !isOwner;
            const canRemoveThisMember = !isOwner && (!isAdmin || canRemoveAdmin);

            return (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="font-medium">
                    {[m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || '—'}
                  </div>
                  <div className="text-muted-foreground text-sm">{m.user.email}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {m.roles.map((r) => {
                      const isOwnerRole = r.name === 'owner' && r.isSystem;
                      const isAdminRole = r.name === 'admin' && r.isSystem;
                      const canRemoveRole = !isOwnerRole && (!isAdminRole || canRemoveAdmin);
                      const remove = removeRoleAction.bind(null, m.id, r.id);
                      return (
                        <Badge
                          key={r.id}
                          variant={r.isSystem ? 'secondary' : 'outline'}
                          className="gap-1"
                        >
                          {tRole(r.name as Parameters<typeof tRole>[0]) ?? r.name}
                          {canRemoveRole ? (
                            <form action={remove}>
                              <button type="submit" aria-label={removeRoleLabel}>
                                <X className="h-3 w-3" />
                              </button>
                            </form>
                          ) : (
                            <span
                              className="cursor-not-allowed opacity-50"
                              title={
                                isOwnerRole
                                  ? ownerRemoveDisabledLabel
                                  : isAdminRole
                                    ? removeAdminDisabledLabel
                                    : undefined
                              }
                            >
                              <X className="h-3 w-3" />
                            </span>
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {showTransfer && (
                      <Button variant="outline" size="sm" onClick={() => openTransfer(m)}>
                        {transferLabel}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canRemoveThisMember}
                      title={
                        isOwner
                          ? ownerRemoveDisabledLabel
                          : isAdmin && !canRemoveAdmin
                            ? removeAdminDisabledLabel
                            : undefined
                      }
                      onClick={async () => {
                        if (!canRemoveThisMember) return;
                        await removeAdminMemberAction(m.id);
                      }}
                    >
                      {removeAdminLabel}
                    </Button>
                    <RoleCombobox
                      membershipId={m.id}
                      options={filteredOptions}
                      assignedIds={new Set(m.roles.map((r) => r.id))}
                      label={assignRoleLabel}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {targetMember && (
        <TransferOwnershipModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          targetEmail={targetMember.user.email}
          targetName={
            [targetMember.user.firstName, targetMember.user.lastName].filter(Boolean).join(' ') ||
            targetMember.user.email
          }
          onConfirm={handleTransfer}
          confirmLabel={transferConfirmLabel}
          descriptionLabel={transferDescriptionLabel}
        />
      )}
    </>
  );
}
