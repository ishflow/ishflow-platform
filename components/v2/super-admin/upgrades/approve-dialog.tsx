'use client';

import { approveUpgradeRequest } from '@/app/[locale]/(app)/super-admin/upgrades/_actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';
import { useFormStatus } from 'react-dom';

const PLAN_OPTIONS = ['free', 'starter', 'pro', 'business', 'enterprise'] as const;
const METHOD_OPTIONS = ['bank_transfer', 'cash', 'card', 'other'] as const;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

export function ApproveUpgradeDialog({
  requestId,
  tenantId,
  defaultPlan,
  triggerLabel,
}: {
  requestId: string;
  tenantId: string;
  defaultPlan: string | null;
  triggerLabel: string;
}) {
  const t = useTranslations('v2_super_admin.upgrades.approve');
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm">{triggerLabel}</Button>} />
      <DialogContent className="bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <form action={approveUpgradeRequest} className="flex flex-col gap-4">
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="tenantId" value={tenantId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="ap-plan">{t('planLabel')}</Label>
            <Select name="plan" defaultValue={defaultPlan ?? 'pro'}>
              <SelectTrigger id="ap-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ap-method">{t('methodLabel')}</Label>
            <Select name="paymentMethod" defaultValue="bank_transfer">
              <SelectTrigger id="ap-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHOD_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`method_${m}` as 'method_bank_transfer')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ap-amount">{t('amountLabel')}</Label>
              <Input id="ap-amount" name="paymentAmount" inputMode="decimal" placeholder="49.00" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ap-currency">{t('currencyLabel')}</Label>
              <Input id="ap-currency" name="paymentCurrency" maxLength={8} placeholder="USD" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ap-ref">{t('referenceLabel')}</Label>
            <Input id="ap-ref" name="paymentReference" maxLength={120} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ap-reason">{t('reasonLabel')}</Label>
            <Textarea id="ap-reason" name="reason" rows={2} maxLength={1000} />
          </div>
          <div className="flex justify-end">
            <SubmitButton label={t('confirm')} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
