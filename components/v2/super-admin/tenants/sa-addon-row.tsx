'use client';

import {
  disableAddon,
  enableAddon,
} from '@/app/[locale]/(app)/super-admin/tenants/[id]/_actions/addons';
import { Button } from '@/components/ui/button';
import type { AddonKey } from '@/platform/addons';
import { useTransition } from 'react';
import { SaConfirmDialog } from './sa-confirm-dialog';

export interface SaAddonRowProps {
  tenantId: string;
  addonKey: AddonKey;
  title: string;
  description: string;
  status: 'ga' | 'beta' | 'planned';
  enabled: boolean;
  /** Pre-rendered "Disable {name}?" with `name` already interpolated. */
  confirmTitle: string;
  /** Pre-rendered "Enabled by {by} on {date}" or null when not enabled. */
  enabledMetaLine: string | null;
  i18n: {
    enable: string;
    disable: string;
    enabling: string;
    confirmDescription: string;
    cancel: string;
    confirmDisable: string;
    statusGa: string;
    statusBeta: string;
    statusPlanned: string;
    stateActive: string;
    stateAvailable: string;
  };
}

const statusPill: Record<SaAddonRowProps['status'], string> = {
  ga: 'pill pill-success',
  beta: 'pill pill-warning',
  planned: 'pill pill-neutral',
};

export function SaAddonRow({
  tenantId,
  addonKey,
  title,
  description,
  status,
  enabled,
  confirmTitle,
  enabledMetaLine,
  i18n,
}: SaAddonRowProps) {
  const [isPending, startTransition] = useTransition();

  function handleEnable() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('tenantId', tenantId);
      fd.set('addonKey', addonKey);
      await enableAddon(fd);
    });
  }

  async function handleDisable() {
    const fd = new FormData();
    fd.set('tenantId', tenantId);
    fd.set('addonKey', addonKey);
    await disableAddon(fd);
  }

  const statusLabel =
    status === 'ga' ? i18n.statusGa : status === 'beta' ? i18n.statusBeta : i18n.statusPlanned;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 14,
        padding: '12px 0',
        borderTop: '1px solid var(--border)',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 13.5 }}>{title}</span>
          <span className={enabled ? 'pill pill-success' : 'pill pill-neutral'}>
            {enabled ? i18n.stateActive : i18n.stateAvailable}
          </span>
          <span className={statusPill[status]}>{statusLabel}</span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{description}</span>
        {enabledMetaLine ? (
          <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>{enabledMetaLine}</span>
        ) : null}
      </div>

      <div>
        {enabled ? (
          <SaConfirmDialog
            trigger={
              <Button variant="outline" size="sm">
                {i18n.disable}
              </Button>
            }
            title={confirmTitle}
            description={i18n.confirmDescription}
            destructive
            confirmLabel={i18n.confirmDisable}
            cancelLabel={i18n.cancel}
            onConfirm={handleDisable}
          />
        ) : (
          <Button size="sm" onClick={handleEnable} disabled={isPending}>
            {isPending ? i18n.enabling : i18n.enable}
          </Button>
        )}
      </div>
    </div>
  );
}
