'use client';

import {
  removePriceOverride,
  savePriceOverride,
} from '@/app/[locale]/(app)/super-admin/tenants/[id]/_actions/overrides';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useId, useState, useTransition } from 'react';

export interface SaPriceOverrideProps {
  tenantId: string;
  current: {
    monthlyPriceUsd: string;
    reason: string | null;
    effectiveUntil: string | null;
    metaLine: string;
  } | null;
  i18n: {
    sectionTitle: string;
    sectionSubtitle: string;
    priceLabel: string;
    pricePlaceholder: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    effectiveUntilLabel: string;
    saveButton: string;
    saving: string;
    removeButton: string;
    removing: string;
    empty: string;
  };
}

export function SaPriceOverride({ tenantId, current, i18n }: SaPriceOverrideProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const priceId = useId();
  const untilId = useId();
  const reasonId = useId();

  function handleSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await savePriceOverride(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('tenantId', tenantId);
      await removePriceOverride(fd);
    });
  }

  return (
    <form
      action={handleSave}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}
    >
      {/* `key` forces a remount whenever the upstream override changes so
        the underlying Base UI FieldControl is re-initialized cleanly with a
        fresh defaultValue — otherwise it warns about an uncontrolled
        component changing its default after init. */}
      <input type="hidden" name="tenantId" value={tenantId} />
      <div
        key={`${current?.monthlyPriceUsd ?? 'none'}|${current?.effectiveUntil ?? 'none'}|${current?.reason ?? 'none'}`}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor={priceId} style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {i18n.priceLabel}
          </label>
          <Input
            id={priceId}
            name="monthlyPriceUsd"
            type="number"
            step="0.01"
            min={0}
            max={100000}
            defaultValue={current?.monthlyPriceUsd ?? ''}
            placeholder={i18n.pricePlaceholder}
            disabled={isPending}
            required
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor={untilId} style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {i18n.effectiveUntilLabel}
          </label>
          <Input
            id={untilId}
            name="effectiveUntil"
            type="date"
            defaultValue={current?.effectiveUntil ?? ''}
            disabled={isPending}
          />
        </div>
      </div>
      <div
        key={`reason|${current?.reason ?? 'none'}`}
        style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        <label htmlFor={reasonId} style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {i18n.reasonLabel}
        </label>
        <Input
          id={reasonId}
          name="reason"
          defaultValue={current?.reason ?? ''}
          placeholder={i18n.reasonPlaceholder}
          maxLength={500}
          disabled={isPending}
        />
      </div>

      {error ? <p style={{ color: 'var(--destructive)', fontSize: 12.5 }}>{error}</p> : null}

      {current ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>{current.metaLine}</div>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>{i18n.empty}</div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {current ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleRemove}
            disabled={isPending}
          >
            {isPending ? i18n.removing : i18n.removeButton}
          </Button>
        ) : null}
        <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
          {isPending ? i18n.saving : i18n.saveButton}
        </Button>
      </div>
    </form>
  );
}
