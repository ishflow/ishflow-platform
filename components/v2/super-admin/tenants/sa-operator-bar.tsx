'use client';

import {
  archive,
  hardDelete,
  liftSuspension,
  suspend,
  transferOwnership,
  wipeData,
} from '@/app/[locale]/(app)/super-admin/tenants/[id]/_actions/tenant-ops';
import {
  type SaMutationSpec,
  SaMutationToolbar,
} from '@/components/v2/super-admin/mutations/sa-mutation-toolbar';
import { useTranslations } from 'next-intl';

export type SaOperatorMember = {
  userId: string;
  email: string;
  fullName: string | null;
};

export interface SaOperatorBarProps {
  tenantId: string;
  tenantSlug: string;
  status: 'active' | 'trialing' | 'past_due' | 'suspended' | 'cancelled' | 'deleted';
  statusLabel: string;
  planMetaLine: string;
  members: SaOperatorMember[];
}

/**
 * Tenant detail action bar — declarative spec of every operator mutation
 * (suspend / lift / archive / transfer / wipe / hard-delete). The generic
 * SaMutationToolbar consumes the spec list and renders buttons + dialogs.
 *
 * Adding a new mutation = append one spec entry below. The toolbar handles
 * useState/useTransition/AlertDialog wiring for every dialog variant.
 */
export function SaOperatorBar({
  tenantId,
  tenantSlug,
  status,
  statusLabel,
  planMetaLine,
  members,
}: SaOperatorBarProps) {
  const t = useTranslations('v2_super_admin.tenants.detail.overview.operatorBar');
  const statusPill = status === 'active' ? 'pill pill-success' : 'pill pill-warning';
  const isSuspended = status === 'suspended';

  const mutations: SaMutationSpec[] = [
    {
      key: 'tenant.suspend',
      action: suspend,
      buttonLabelKey: 'suspend',
      buttonIcon: 'Pause',
      hideWhen: isSuspended,
      hiddenFields: { tenantId },
      dialog: {
        type: 'textInput',
        titleKey: 'suspendDialog.title',
        descriptionKey: 'suspendDialog.description',
        confirmKey: 'suspendDialog.confirm',
        pendingKey: 'suspendDialog.saving',
        inputName: 'reason',
        labelKey: 'suspendDialog.reasonLabel',
        placeholderKey: 'suspendDialog.reasonPlaceholder',
        required: true,
      },
    },
    {
      key: 'tenant.lift',
      action: liftSuspension,
      buttonLabelKey: 'lift',
      buttonIcon: 'Play',
      hideWhen: !isSuspended,
      hiddenFields: { tenantId },
      dialog: {
        type: 'confirm',
        titleKey: 'liftDialog.title',
        descriptionKey: 'liftDialog.description',
        confirmKey: 'confirmCommon.confirm',
      },
    },
    {
      key: 'tenant.archive',
      action: archive,
      buttonLabelKey: 'archive',
      buttonIcon: 'Archive',
      hiddenFields: { tenantId },
      dialog: {
        type: 'confirm',
        titleKey: 'archiveDialog.title',
        descriptionKey: 'archiveDialog.description',
        confirmKey: 'archiveDialog.confirmText',
        destructive: true,
      },
    },
    {
      key: 'tenant.transfer',
      action: transferOwnership,
      buttonLabelKey: 'transfer',
      buttonIcon: 'Shuffle',
      hiddenFields: { tenantId },
      dialog: {
        type: 'select',
        titleKey: 'transferDialog.title',
        descriptionKey: 'transferDialog.description',
        confirmKey: 'transferDialog.confirm',
        pendingKey: 'transferDialog.saving',
        inputName: 'newOwnerUserId',
        labelKey: 'transferDialog.memberLabel',
        placeholderKey: 'transferDialog.placeholder',
        emptyKey: 'transferDialog.emptyMembers',
        options: members.map((m) => ({
          value: m.userId,
          label: m.fullName ? `${m.fullName} · ${m.email}` : m.email,
        })),
      },
    },
    {
      key: 'tenant.wipe',
      action: wipeData,
      buttonLabelKey: 'wipeData',
      buttonIcon: 'X',
      hiddenFields: { tenantId, confirmSlug: tenantSlug },
      dialog: {
        type: 'slugConfirm',
        titleKey: 'wipeDataDialog.title',
        descriptionKey: 'wipeDataDialog.description',
        confirmKey: 'wipeDataDialog.confirm',
        pendingKey: 'wipeDataDialog.pending',
        confirmLabelKey: 'wipeDataDialog.confirmLabel',
        i18nParams: { slug: tenantSlug },
      },
    },
    {
      key: 'tenant.hardDelete',
      action: hardDelete,
      buttonLabelKey: 'hardDelete',
      buttonIcon: 'Trash2',
      buttonVariant: 'destructive',
      hiddenFields: { tenantId, confirmSlug: tenantSlug },
      dialog: {
        type: 'slugConfirm',
        titleKey: 'hardDeleteDialog.title',
        descriptionKey: 'hardDeleteDialog.description',
        confirmKey: 'hardDeleteDialog.confirm',
        pendingKey: 'hardDeleteDialog.pending',
        confirmLabelKey: 'hardDeleteDialog.confirmLabel',
        i18nParams: { slug: tenantSlug },
      },
    },
  ];

  return (
    <SaMutationToolbar
      t={t}
      mutations={mutations}
      cancelLabelKey="confirmCommon.cancel"
      leading={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: 'var(--text-muted)',
          }}
        >
          {t('status')} <span className={statusPill}>{statusLabel}</span>
          <span style={{ marginLeft: 6 }}>·</span>
          <span>{planMetaLine}</span>
        </div>
      }
    />
  );
}
