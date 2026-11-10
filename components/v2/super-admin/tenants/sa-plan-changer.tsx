'use client';

import { changePlan } from '@/app/[locale]/(app)/super-admin/tenants/[id]/_actions/subscription';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TenantPlan, TenantStatus } from '@prisma/client';
import { useId, useState, useTransition } from 'react';

export interface SaPlanChangerProps {
  tenantId: string;
  currentPlan: TenantPlan;
  currentStatus: TenantStatus;
  i18n: {
    triggerLabel: string;
    title: string;
    description: string;
    planLabel: string;
    statusLabel: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    cancel: string;
    confirm: string;
    saving: string;
    planNames: Record<TenantPlan, string>;
    statusNames: Record<TenantStatus, string>;
  };
}

const PLANS: TenantPlan[] = ['free', 'starter', 'pro', 'business', 'enterprise'];
const STATUSES: TenantStatus[] = ['active', 'trialing', 'past_due', 'suspended', 'cancelled'];

export function SaPlanChanger({ tenantId, currentPlan, currentStatus, i18n }: SaPlanChangerProps) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<TenantPlan>(currentPlan);
  const [status, setStatus] = useState<TenantStatus>(currentStatus);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const planId = useId();
  const statusId = useId();
  const reasonId = useId();

  const disabled =
    isPending || reason.trim().length === 0 || (plan === currentPlan && status === currentStatus);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('tenantId', tenantId);
        fd.set('plan', plan);
        fd.set('status', status);
        fd.set('reason', reason);
        await changePlan(fd);
        setOpen(false);
        setReason('');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPlan(currentPlan);
          setStatus(currentStatus);
          setReason('');
          setError(null);
        }
        setOpen(next);
      }}
    >
      <AlertDialogTrigger
        render={
          <Button type="button" size="sm" variant="secondary">
            {i18n.triggerLabel}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{i18n.title}</AlertDialogTitle>
          <AlertDialogDescription>{i18n.description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor={planId} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {i18n.planLabel}
              </label>
              <select
                id={planId}
                value={plan}
                onChange={(e) => setPlan(e.target.value as TenantPlan)}
                disabled={isPending}
                style={{
                  padding: '8px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--surface)',
                  fontSize: 13,
                }}
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {i18n.planNames[p]}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor={statusId} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {i18n.statusLabel}
              </label>
              <select
                id={statusId}
                value={status}
                onChange={(e) => setStatus(e.target.value as TenantStatus)}
                disabled={isPending}
                style={{
                  padding: '8px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--surface)',
                  fontSize: 13,
                }}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {i18n.statusNames[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor={reasonId} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {i18n.reasonLabel}
            </label>
            <Input
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={i18n.reasonPlaceholder}
              maxLength={1000}
              disabled={isPending}
              required
            />
          </div>
        </div>

        {error ? <p style={{ color: 'var(--destructive)', fontSize: 12.5 }}>{error}</p> : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{i18n.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (disabled) return;
              handleConfirm();
            }}
            disabled={disabled}
          >
            {isPending ? i18n.saving : i18n.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
