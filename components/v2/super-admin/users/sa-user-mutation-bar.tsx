'use client';

import { softDelete } from '@/app/[locale]/(app)/super-admin/users/[id]/_actions/user-ops';
import {
  type SaMutationSpec,
  SaMutationToolbar,
} from '@/components/v2/super-admin/mutations/sa-mutation-toolbar';
import { useTranslations } from 'next-intl';

export interface SaUserMutationBarProps {
  userId: string;
  email: string;
  status: 'active' | 'deleted';
}

/**
 * User detail action bar. Currently single mutation (softDelete) — extends
 * with link-clerk-id / password-reset / revoke-sessions as those backends
 * land. The same SaMutationToolbar consumes the spec list.
 *
 * softDelete is hidden when the user is already tombstoned (status='deleted').
 */
export function SaUserMutationBar({ userId, email, status }: SaUserMutationBarProps) {
  const t = useTranslations('v2_super_admin.users.detail.mutationBar');

  const mutations: SaMutationSpec[] = [
    {
      key: 'user.softDelete',
      action: softDelete,
      buttonLabelKey: 'softDelete',
      buttonIcon: 'Trash2',
      buttonVariant: 'destructive',
      hideWhen: status === 'deleted',
      hiddenFields: { userId },
      dialog: {
        type: 'slugConfirm',
        titleKey: 'softDeleteDialog.title',
        descriptionKey: 'softDeleteDialog.description',
        confirmKey: 'softDeleteDialog.confirm',
        pendingKey: 'softDeleteDialog.pending',
        confirmLabelKey: 'softDeleteDialog.confirmLabel',
        i18nParams: { email },
      },
    },
  ];

  // Slug confirm by retyping email (same pattern as tenant slug).
  // Hidden field name overridden — match by adding email to hiddenFields key
  // expected by the toolbar (`confirmSlug`).
  const specsWithSlug = mutations.map((m) =>
    m.dialog.type === 'slugConfirm'
      ? { ...m, hiddenFields: { ...m.hiddenFields, confirmSlug: email } }
      : m,
  );

  if (specsWithSlug.every((m) => m.hideWhen)) return null;

  return (
    <SaMutationToolbar t={t} mutations={specsWithSlug} cancelLabelKey="confirmCommon.cancel" />
  );
}
