'use client';

import {
  addFeatureKill,
  removeFeatureKill,
} from '@/app/[locale]/(app)/super-admin/tenants/[id]/_actions/overrides';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRef, useState, useTransition } from 'react';

export interface SaFeatureKillListProps {
  tenantId: string;
  kills: Array<{
    featureKey: string;
    reason: string | null;
    metaLine: string;
  }>;
  i18n: {
    sectionTitle: string;
    sectionSubtitle: string;
    keyPlaceholder: string;
    reasonPlaceholder: string;
    addButton: string;
    adding: string;
    empty: string;
    removeAria: string;
  };
}

export function SaFeatureKillList({ tenantId, kills, i18n }: SaFeatureKillListProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);

  function handleAdd(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addFeatureKill(formData);
        if (keyRef.current) keyRef.current.value = '';
        if (reasonRef.current) reasonRef.current.value = '';
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  function handleRemove(featureKey: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('tenantId', tenantId);
      fd.set('featureKey', featureKey);
      await removeFeatureKill(fd);
    });
  }

  return (
    <>
      <form
        action={handleAdd}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 14 }}
      >
        <input type="hidden" name="tenantId" value={tenantId} />
        <Input
          ref={keyRef}
          name="featureKey"
          placeholder={i18n.keyPlaceholder}
          required
          maxLength={128}
          pattern="[A-Za-z0-9_.\-]+"
          title="alphanumeric / _ / - / . only"
          disabled={isPending}
        />
        <Input
          ref={reasonRef}
          name="reason"
          placeholder={i18n.reasonPlaceholder}
          maxLength={500}
          disabled={isPending}
        />
        <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
          {isPending ? i18n.adding : i18n.addButton}
        </Button>
      </form>

      {error ? (
        <p style={{ color: 'var(--destructive)', fontSize: 12.5, marginBottom: 10 }}>{error}</p>
      ) : null}

      {kills.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{i18n.empty}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {kills.map((kill, i) => (
            <div
              key={kill.featureKey}
              style={{
                padding: '10px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                fontSize: 13,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 14,
                alignItems: 'center',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <code style={{ fontWeight: 600 }}>{kill.featureKey}</code>
                {kill.reason ? (
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>— {kill.reason}</span>
                ) : null}
                <div style={{ color: 'var(--text-muted)', fontSize: 11.5, marginTop: 2 }}>
                  {kill.metaLine}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={i18n.removeAria}
                onClick={() => handleRemove(kill.featureKey)}
                disabled={isPending}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
