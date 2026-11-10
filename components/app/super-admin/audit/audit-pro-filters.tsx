'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AUDIT_CATEGORIES } from '@/platform/super-admin/audit-pro/categories';
import type {
  SavedFilter,
  SavedFilterCriteria,
} from '@/platform/super-admin/audit-pro/saved-filters';
import type { SuperAdminProDict } from '@/platform/super-admin/pro-messages';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

const ALL_VALUE = '__all__';

export interface AuditProFilterValues {
  action?: string;
  actorClerkId?: string;
  tenantId?: string;
  entity?: string;
  category?: string;
  q?: string;
  from?: string;
  to?: string;
}

interface AuditProFiltersProps {
  filters: AuditProFilterValues;
  entityOptions: string[];
  actionOptions: ReadonlyArray<string>;
  baseFilterLabels: {
    title: string;
    description: string;
    actionLabel: string;
    actorLabel: string;
    actorPlaceholder: string;
    tenantLabel: string;
    tenantPlaceholder: string;
    allActions: string;
    apply: string;
    reset: string;
  };
  proLabels: SuperAdminProDict['audit']['filters'];
  savedFilters: SavedFilter[];
  applySavedHref: (criteria: SavedFilterCriteria) => string;
  saveAction: (
    name: string,
    criteria: SavedFilterCriteria,
  ) => Promise<{ ok: boolean; message?: string }>;
  deleteAction: (filterId: string) => Promise<{ ok: boolean; message?: string }>;
}

export function AuditProFilters({
  filters,
  entityOptions,
  actionOptions,
  baseFilterLabels,
  proLabels,
  savedFilters,
  applySavedHref,
  saveAction,
  deleteAction,
}: AuditProFiltersProps) {
  const hasFilters =
    !!filters.action ||
    !!filters.actorClerkId ||
    !!filters.tenantId ||
    !!filters.entity ||
    !!filters.category ||
    !!filters.q ||
    !!filters.from ||
    !!filters.to;

  const [saveName, setSaveName] = useState('');
  const [pending, startTransition] = useTransition();

  const currentCriteria: SavedFilterCriteria = {
    action: filters.action || undefined,
    actorClerkId: filters.actorClerkId || undefined,
    tenantId: filters.tenantId || undefined,
    entity: filters.entity || undefined,
    category: filters.category || undefined,
    q: filters.q || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };

  const handleSave = () => {
    const name = saveName.trim();
    if (!name) {
      toast.error(proLabels.saveAsPlaceholder);
      return;
    }
    startTransition(async () => {
      const res = await saveAction(name, currentCriteria);
      if (res.ok) {
        toast.success('✓');
        setSaveName('');
      } else {
        toast.error(res.message ?? 'error');
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteAction(id);
      if (res.ok) toast.success('✓');
      else toast.error(res.message ?? 'error');
    });
  };

  const exportHref = buildHref('/super-admin/audit/export', currentCriteria);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{baseFilterLabels.title}</CardTitle>
        <CardDescription>{baseFilterLabels.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form
          method="GET"
          action="/super-admin/audit"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-action">{baseFilterLabels.actionLabel}</Label>
            <Select name="action" defaultValue={filters.action || ALL_VALUE}>
              <SelectTrigger id="audit-action" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{baseFilterLabels.allActions}</SelectItem>
                {actionOptions.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-entity">{proLabels.entityLabel}</Label>
            <Select name="entity" defaultValue={filters.entity || ALL_VALUE}>
              <SelectTrigger id="audit-entity" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{proLabels.entityAll}</SelectItem>
                {entityOptions.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-category">{proLabels.categoryLabel}</Label>
            <Select name="category" defaultValue={filters.category || ALL_VALUE}>
              <SelectTrigger id="audit-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{proLabels.categoryAll}</SelectItem>
                {AUDIT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {proLabels.categories[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-actor">{baseFilterLabels.actorLabel}</Label>
            <Input
              id="audit-actor"
              type="text"
              name="actorClerkId"
              defaultValue={filters.actorClerkId ?? ''}
              placeholder={baseFilterLabels.actorPlaceholder}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-tenant">{baseFilterLabels.tenantLabel}</Label>
            <Input
              id="audit-tenant"
              type="text"
              name="tenantId"
              defaultValue={filters.tenantId ?? ''}
              placeholder={baseFilterLabels.tenantPlaceholder}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-from">{proLabels.dateFromLabel}</Label>
            <Input id="audit-from" type="date" name="from" defaultValue={filters.from ?? ''} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-to">{proLabels.dateToLabel}</Label>
            <Input id="audit-to" type="date" name="to" defaultValue={filters.to ?? ''} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-q">{proLabels.qLabel}</Label>
            <Input
              id="audit-q"
              type="text"
              name="q"
              defaultValue={filters.q ?? ''}
              placeholder={proLabels.qPlaceholder}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{proLabels.qHint}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit">{baseFilterLabels.apply}</Button>
              {hasFilters ? (
                <Link href="/super-admin/audit" className={buttonVariants({ variant: 'ghost' })}>
                  {baseFilterLabels.reset}
                </Link>
              ) : null}
              {hasFilters ? (
                <a href={exportHref} className={buttonVariants({ variant: 'outline' })} download>
                  {proLabels.export}
                </a>
              ) : null}
            </div>
          </div>
        </form>

        <Separator />

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">{proLabels.savedTitle}</p>
          </div>
          {savedFilters.length === 0 ? (
            <p className="text-xs text-muted-foreground">{proLabels.savedEmpty}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {savedFilters.map((sf) => (
                <span
                  key={sf.id}
                  className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <Link
                    href={applySavedHref(sf.criteria)}
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    {sf.name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(sf.id)}
                    disabled={pending}
                    className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                    aria-label={proLabels.deleteSaved}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {hasFilters ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="audit-save-name">{proLabels.saveAs}</Label>
                <Input
                  id="audit-save-name"
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={proLabels.saveAsPlaceholder}
                  maxLength={80}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleSave}
                disabled={pending || !saveName.trim()}
              >
                {proLabels.saveButton}
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function buildHref(base: string, criteria: SavedFilterCriteria): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(criteria)) {
    if (typeof v === 'string' && v.trim()) params.set(k, v.trim());
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
