'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { SuperAdminDict } from '@/platform/super-admin/dict';
import type { TenantPlan, TenantStatus } from '@prisma/client';
import { useState, useTransition } from 'react';

const PLANS: ReadonlyArray<TenantPlan> = ['free', 'starter', 'pro', 'business', 'enterprise'];
const STATUSES: ReadonlyArray<TenantStatus> = [
  'active',
  'trialing',
  'past_due',
  'suspended',
  'cancelled',
];

interface Props {
  tenantId: string;
  currentPlan: TenantPlan;
  currentStatus: TenantStatus;
  action: (formData: FormData) => Promise<void>;
  dict: {
    manualUpgrade: SuperAdminDict['subscription']['manualUpgrade'];
    planOptions: SuperAdminDict['subscription']['planOptions'];
    statusOptions: SuperAdminDict['subscription']['statusOptions'];
  };
}

export function ManualUpgradeForm({ tenantId, currentPlan, currentStatus, action, dict }: Props) {
  const [plan, setPlan] = useState<TenantPlan>(currentPlan);
  const [status, setStatus] = useState<TenantStatus>(currentStatus);
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();
  const t = dict.manualUpgrade;
  const planLabels = dict.planOptions;
  const statusLabels = dict.statusOptions;

  const dirty = plan !== currentPlan || status !== currentStatus;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dirty || pending) return;
    const planLine = t.confirmPlanLine
      .replace('{from}', planLabels[currentPlan])
      .replace('{to}', planLabels[plan]);
    const statusLine = t.confirmStatusLine
      .replace('{from}', statusLabels[currentStatus])
      .replace('{to}', statusLabels[status]);
    const confirmMsg = `${t.confirmTitle}\n\n${planLine}\n${statusLine}\n\n${t.confirmFooter}`;
    if (!window.confirm(confirmMsg)) return;
    const fd = new FormData();
    fd.append('tenantId', tenantId);
    fd.append('plan', plan);
    fd.append('status', status);
    fd.append('reason', reason);
    startTransition(() => action(fd));
  };

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-upgrade-plan">{t.planLabel}</Label>
              <Select
                value={plan}
                onValueChange={(value) => {
                  if (value) setPlan(value as TenantPlan);
                }}
                disabled={pending}
              >
                <SelectTrigger id="manual-upgrade-plan" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {planLabels[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-upgrade-status">{t.statusLabel}</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  if (value) setStatus(value as TenantStatus);
                }}
                disabled={pending}
              >
                <SelectTrigger id="manual-upgrade-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual-upgrade-reason">{t.reasonLabel}</Label>
            <Textarea
              id="manual-upgrade-reason"
              name="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t.reasonPlaceholder}
              rows={3}
              maxLength={1000}
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">{t.reasonHint}</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{t.currentLabel}</span>
            <Badge variant="secondary">{planLabels[currentPlan]}</Badge>
            <span aria-hidden="true">·</span>
            <Badge variant="outline">{statusLabels[currentStatus]}</Badge>
          </p>
          <Button type="submit" disabled={!dirty || pending}>
            {pending ? '…' : t.apply}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
