'use client';

import {
  changeRole,
  removeMember,
} from '@/app/[locale]/(app)/super-admin/tenants/[id]/_actions/members';
import { Button } from '@/components/ui/button';
import { useId, useState, useTransition } from 'react';
import { SaConfirmDialog } from './sa-confirm-dialog';

export interface SaMemberRowProps {
  tenantId: string;
  membershipId: string;
  fullName: string;
  email: string;
  currentRoleId: string | null;
  availableRoles: Array<{ id: string; name: string }>;
  i18n: {
    saving: string;
    removeAria: string;
    removeTitle: string;
    removeDescription: string;
    removeConfirm: string;
    cancel: string;
    noRolePlaceholder: string;
  };
}

export function SaMemberRow({
  tenantId,
  membershipId,
  fullName,
  email,
  currentRoleId,
  availableRoles,
  i18n,
}: SaMemberRowProps) {
  const [selectedRoleId, setSelectedRoleId] = useState(currentRoleId ?? '');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const selectId = useId();

  function handleRoleChange(nextRoleId: string) {
    setError(null);
    setSelectedRoleId(nextRoleId);
    if (!nextRoleId || nextRoleId === currentRoleId) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('tenantId', tenantId);
        fd.set('membershipId', membershipId);
        fd.set('roleId', nextRoleId);
        await changeRole(fd);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setSelectedRoleId(currentRoleId ?? '');
      }
    });
  }

  async function handleRemove() {
    const fd = new FormData();
    fd.set('tenantId', tenantId);
    fd.set('membershipId', membershipId);
    await removeMember(fd);
  }

  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{fullName}</td>
      <td>
        <span className="dim">{email}</span>
      </td>
      <td>
        <select
          id={selectId}
          value={selectedRoleId}
          onChange={(e) => handleRoleChange(e.target.value)}
          disabled={isPending}
          style={{
            padding: '5px 8px',
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'var(--surface)',
            fontSize: 12.5,
            minWidth: 140,
          }}
        >
          <option value="" disabled>
            {i18n.noRolePlaceholder}
          </option>
          {availableRoles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {isPending ? (
          <span style={{ marginLeft: 6, color: 'var(--text-muted)', fontSize: 11.5 }}>
            {i18n.saving}
          </span>
        ) : null}
        {error ? (
          <span style={{ marginLeft: 6, color: 'var(--destructive)', fontSize: 11.5 }}>
            {error}
          </span>
        ) : null}
      </td>
      <td style={{ textAlign: 'right' }}>
        <SaConfirmDialog
          trigger={
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={i18n.removeAria}
              disabled={isPending}
            >
              ×
            </Button>
          }
          title={i18n.removeTitle}
          description={i18n.removeDescription}
          destructive
          confirmLabel={i18n.removeConfirm}
          cancelLabel={i18n.cancel}
          onConfirm={handleRemove}
        />
      </td>
    </tr>
  );
}
