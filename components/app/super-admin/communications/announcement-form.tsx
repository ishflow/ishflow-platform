'use client';

import type { AnnouncementStatus, AnnouncementSurface } from '@prisma/client';
/**
 * Form for creating / editing a `MarketingAnnouncement` from the Super Admin
 * console. Includes:
 *
 *  - metadata (key, surface, status, schedule, CTA)
 *  - per-locale translations (en/ru/tr primary; other 5 hidden behind toggle)
 *  - targeting axes as comma-separated string lists
 *  - live preview of the selected surface
 *
 * Submits via the provided server action.
 */
import { useMemo, useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { SuperAdminDict } from '@/platform/super-admin/dict';

export const PRIMARY_LOCALES = ['en', 'ru', 'tr'] as const;
export const EXTRA_LOCALES = ['uz', 'ky', 'de', 'fr', 'zh'] as const;
export const ALL_LOCALES = [...PRIMARY_LOCALES, ...EXTRA_LOCALES] as const;
export type AnnouncementLocale = (typeof ALL_LOCALES)[number];

interface Targeting {
  plans: string;
  addons: string;
  roles: string;
  locales: string;
  tenantIds: string;
}

export interface AnnouncementFormInitial {
  internalKey: string;
  surface: AnnouncementSurface;
  status: AnnouncementStatus;
  startAt: string; // datetime-local format
  endAt: string;
  dismissible: boolean;
  ctaLabel: string;
  ctaUrl: string;
  translations: Record<AnnouncementLocale, { title: string; body: string }>;
  targeting: Targeting;
}

const SURFACES: AnnouncementSurface[] = ['banner', 'popup', 'feed_only'];
const STATUSES: AnnouncementStatus[] = ['draft', 'scheduled', 'live', 'archived'];

export function emptyInitial(): AnnouncementFormInitial {
  const translations = ALL_LOCALES.reduce(
    (acc, loc) => {
      acc[loc] = { title: '', body: '' };
      return acc;
    },
    {} as Record<AnnouncementLocale, { title: string; body: string }>,
  );
  return {
    internalKey: '',
    surface: 'banner',
    status: 'draft',
    startAt: '',
    endAt: '',
    dismissible: true,
    ctaLabel: '',
    ctaUrl: '',
    translations,
    targeting: { plans: '', addons: '', roles: '', locales: '', tenantIds: '' },
  };
}

interface Props {
  dict: SuperAdminDict;
  initial: AnnouncementFormInitial;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}

export function AnnouncementForm({ dict, initial, action, submitLabel }: Props) {
  const t = dict.communications;
  const [internalKey, setInternalKey] = useState(initial.internalKey);
  const [surface, setSurface] = useState<AnnouncementSurface>(initial.surface);
  const [status, setStatus] = useState<AnnouncementStatus>(initial.status);
  const [startAt, setStartAt] = useState(initial.startAt);
  const [endAt, setEndAt] = useState(initial.endAt);
  const [dismissible, setDismissible] = useState(initial.dismissible);
  const [ctaLabel, setCtaLabel] = useState(initial.ctaLabel);
  const [ctaUrl, setCtaUrl] = useState(initial.ctaUrl);
  const [translations, setTranslations] = useState(initial.translations);
  const [targeting, setTargeting] = useState(initial.targeting);
  const [showExtra, setShowExtra] = useState(false);
  const [pending, startTransition] = useTransition();

  const updateTranslation = (
    locale: AnnouncementLocale,
    field: 'title' | 'body',
    value: string,
  ) => {
    setTranslations((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [field]: value },
    }));
  };

  const previewLocale: AnnouncementLocale = useMemo(() => {
    const en = translations.en;
    if (en.title || en.body) return 'en';
    for (const l of ALL_LOCALES) {
      if (translations[l].title || translations[l].body) return l;
    }
    return 'en';
  }, [translations]);

  const previewTitle = translations[previewLocale].title || '—';
  const previewBody = translations[previewLocale].body || '—';

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      await action(fd);
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.form.sectionMeta}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="internalKey">{t.form.internalKey}</Label>
            <Input
              id="internalKey"
              name="internalKey"
              required
              value={internalKey}
              onChange={(e) => setInternalKey(e.target.value)}
              placeholder="2026-05-launch"
            />
            <p className="text-xs text-muted-foreground">{t.form.internalKeyHint}</p>
          </div>
          <div className="space-y-1.5">
            <Label>{t.form.surface}</Label>
            <Select value={surface} onValueChange={(v) => setSurface(v as AnnouncementSurface)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SURFACES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t.surfaces[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="surface" value={surface} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.form.status}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AnnouncementStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t.statuses[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="status" value={status} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startAt">{t.form.startAt}</Label>
            <Input
              id="startAt"
              name="startAt"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endAt">{t.form.endAt}</Label>
            <Input
              id="endAt"
              name="endAt"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 md:col-span-1">
            <Label htmlFor="dismissible">{t.form.dismissible}</Label>
            <Switch
              id="dismissible"
              name="dismissible"
              checked={dismissible}
              onCheckedChange={setDismissible}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ctaLabel">{t.form.ctaLabel}</Label>
            <Input
              id="ctaLabel"
              name="ctaLabel"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="ctaUrl">{t.form.ctaUrl}</Label>
            <Input
              id="ctaUrl"
              name="ctaUrl"
              type="url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.form.sectionTranslations}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="en">
            <TabsList>
              {(showExtra ? [...PRIMARY_LOCALES, ...EXTRA_LOCALES] : [...PRIMARY_LOCALES]).map(
                (loc) => (
                  <TabsTrigger key={loc} value={loc}>
                    {loc.toUpperCase()}
                  </TabsTrigger>
                ),
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowExtra((v) => !v)}
              >
                {showExtra ? '−' : '+'} {EXTRA_LOCALES.join(' / ')}
              </Button>
            </TabsList>
            {(showExtra ? ALL_LOCALES : PRIMARY_LOCALES).map((loc) => (
              <TabsContent key={loc} value={loc} className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`title-${loc}`}>{t.form.title}</Label>
                  <Input
                    id={`title-${loc}`}
                    name={`translations[${loc}][title]`}
                    value={translations[loc].title}
                    onChange={(e) => updateTranslation(loc, 'title', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`body-${loc}`}>{t.form.body}</Label>
                  <Textarea
                    id={`body-${loc}`}
                    name={`translations[${loc}][body]`}
                    rows={6}
                    value={translations[loc].body}
                    onChange={(e) => updateTranslation(loc, 'body', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t.form.bodyHint}</p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.form.sectionTargeting}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="plans">{t.form.plans}</Label>
            <Input
              id="plans"
              name="plans"
              value={targeting.plans}
              onChange={(e) => setTargeting({ ...targeting, plans: e.target.value })}
              placeholder="pro, business"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addons">{t.form.addons}</Label>
            <Input
              id="addons"
              name="addons"
              value={targeting.addons}
              onChange={(e) => setTargeting({ ...targeting, addons: e.target.value })}
              placeholder="ai_invoice_ocr"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="roles">{t.form.roles}</Label>
            <Input
              id="roles"
              name="roles"
              value={targeting.roles}
              onChange={(e) => setTargeting({ ...targeting, roles: e.target.value })}
              placeholder="owner, admin"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="locales">{t.form.locales}</Label>
            <Input
              id="locales"
              name="locales"
              value={targeting.locales}
              onChange={(e) => setTargeting({ ...targeting, locales: e.target.value })}
              placeholder="ru, en, tr"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="tenantIds">{t.form.tenantIds}</Label>
            <Input
              id="tenantIds"
              name="tenantIds"
              value={targeting.tenantIds}
              onChange={(e) => setTargeting({ ...targeting, tenantIds: e.target.value })}
              placeholder="uuid, uuid"
            />
            <p className="text-xs text-muted-foreground">{t.form.tenantIdsHint}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.form.sectionPreview}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 pb-3 text-xs text-muted-foreground">
            <Badge variant="outline">{t.surfaces[surface]}</Badge>
            <Badge variant="outline">{previewLocale.toUpperCase()}</Badge>
          </div>
          {surface === 'banner' && (
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <p className="text-sm font-medium">{previewTitle}</p>
              <p className="text-sm text-muted-foreground">{previewBody}</p>
            </div>
          )}
          {surface === 'popup' && (
            <div className="mx-auto max-w-sm rounded-lg border bg-popover p-4 shadow">
              <p className="text-base font-medium">{previewTitle}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {previewBody}
              </p>
              {ctaUrl && ctaLabel && (
                <div className="mt-3 flex justify-end">
                  <Button size="sm" type="button">
                    {ctaLabel}
                  </Button>
                </div>
              )}
            </div>
          )}
          {surface === 'feed_only' && (
            <div className="rounded-md border bg-card p-3">
              <p className="text-sm font-medium">{previewTitle}</p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                {previewBody}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? dict.common.applying : submitLabel}
        </Button>
      </div>
    </form>
  );
}
