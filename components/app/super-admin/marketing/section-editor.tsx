'use client';

import { upsertSection } from '@/app/super-admin/marketing/_actions/sections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  MARKETING_EDITOR_LOCALES,
  type MarketingEditorLocale,
} from '@/platform/marketing/section-catalog';
import { SECTION_SCHEMAS, type SectionType } from '@/platform/marketing/section-schemas';
import type { SuperAdminDict } from '@/platform/super-admin/dict';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState, useTransition } from 'react';

type DictMarketing = SuperAdminDict['marketing'];

export interface SectionEditorProps {
  pageKey: string;
  sectionKey: string;
  type: SectionType;
  /** Map of locale → content JSON (already DB-loaded). Missing locales use defaults. */
  initialByLocale: Record<MarketingEditorLocale, unknown>;
  defaults: unknown;
  dict: DictMarketing;
  commonSave: string;
}

interface SaveState {
  state: 'idle' | 'saving' | 'saved' | 'error';
  error?: string;
}

export function SectionEditor(props: SectionEditorProps) {
  const [locale, setLocale] = useState<MarketingEditorLocale>('en');
  return (
    <div className="space-y-4">
      <Tabs value={locale} onValueChange={(v) => setLocale(v as MarketingEditorLocale)}>
        <TabsList>
          {MARKETING_EDITOR_LOCALES.map((l) => (
            <TabsTrigger key={l} value={l} className="uppercase">
              {l}
            </TabsTrigger>
          ))}
        </TabsList>
        {MARKETING_EDITOR_LOCALES.map((l) => (
          <TabsContent key={l} value={l} className="pt-4">
            <LocaleForm
              pageKey={props.pageKey}
              sectionKey={props.sectionKey}
              type={props.type}
              locale={l}
              initial={props.initialByLocale[l] ?? props.defaults}
              dict={props.dict}
              commonSave={props.commonSave}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

interface LocaleFormProps {
  pageKey: string;
  sectionKey: string;
  type: SectionType;
  locale: MarketingEditorLocale;
  initial: unknown;
  dict: DictMarketing;
  commonSave: string;
}

function LocaleForm({
  pageKey,
  sectionKey,
  type,
  locale,
  initial,
  dict,
  commonSave: _commonSave,
}: LocaleFormProps) {
  const [value, setValue] = useState<unknown>(initial);
  const [save, setSave] = useState<SaveState>({ state: 'idle' });
  const [, startTransition] = useTransition();

  const validation = useMemo(() => {
    const result = SECTION_SCHEMAS[type].safeParse(value);
    return result;
  }, [value, type]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!validation.success) {
        setSave({ state: 'error', error: validation.error.message });
        return;
      }
      const fd = new FormData();
      fd.append('pageKey', pageKey);
      fd.append('sectionKey', sectionKey);
      fd.append('locale', locale);
      fd.append('content', JSON.stringify(validation.data));
      setSave({ state: 'saving' });
      startTransition(async () => {
        try {
          await upsertSection(fd);
          setSave({ state: 'saved' });
        } catch (err) {
          setSave({
            state: 'error',
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });
    },
    [pageKey, sectionKey, locale, validation],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SectionFields type={type} value={value} onChange={setValue} dict={dict} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={save.state === 'saving' || !validation.success}>
          <Save className="mr-2 h-4 w-4" />
          {save.state === 'saving' ? dict.common.saving : dict.common.saveSection}
        </Button>
        {save.state === 'saved' && (
          <span className="text-xs text-muted-foreground">{dict.sections.edit.savedSuccess}</span>
        )}
        {save.state === 'error' && (
          <span className="text-xs text-destructive">
            {save.error ?? dict.sections.edit.saveError}
          </span>
        )}
        {!validation.success && save.state !== 'saving' && (
          <span className="text-xs text-destructive">{dict.sections.edit.saveError}</span>
        )}
      </div>
    </form>
  );
}

interface FieldsProps {
  type: SectionType;
  value: unknown;
  onChange: (next: unknown) => void;
  dict: DictMarketing;
}

function SectionFields({ type, value, onChange, dict }: FieldsProps) {
  switch (type) {
    case 'hero':
      return <HeroFields value={value} onChange={onChange} dict={dict} />;
    case 'feature.cards':
      return <FeatureCardsFields value={value} onChange={onChange} dict={dict} />;
    case 'social_proof':
      return <SocialProofFields value={value} onChange={onChange} dict={dict} />;
    case 'testimonials':
      return <TestimonialsFields value={value} onChange={onChange} dict={dict} />;
    case 'faq':
      return <FaqFields value={value} onChange={onChange} dict={dict} />;
    case 'footer.columns':
      return <FooterColumnsFields value={value} onChange={onChange} dict={dict} />;
  }
}

// --- helpers ----------------------------------------------------------

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function stringValue(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === 'string' ? v : '';
}

// --- hero -------------------------------------------------------------

function HeroFields({
  value,
  onChange,
  dict,
}: { value: unknown; onChange: (n: unknown) => void; dict: DictMarketing }) {
  const v = asRecord(value);
  const primary = asRecord(v.primaryCta);
  const secondary = asRecord(v.secondaryCta);
  const update = (patch: Record<string, unknown>) => onChange({ ...v, ...patch });
  return (
    <div className="space-y-3">
      <Field label={dict.sections.forms.hero.headline}>
        <Input
          value={stringValue(v, 'headline')}
          onChange={(e) => update({ headline: e.target.value })}
        />
      </Field>
      <Field label={dict.sections.forms.hero.subhead}>
        <Textarea
          rows={2}
          value={stringValue(v, 'subhead')}
          onChange={(e) => update({ subhead: e.target.value })}
        />
      </Field>
      <Field label={dict.sections.forms.hero.heroImageUrl}>
        <Input
          value={stringValue(v, 'heroImageUrl')}
          onChange={(e) => update({ heroImageUrl: e.target.value })}
        />
      </Field>
      <Fieldset legend={dict.sections.forms.hero.primaryCta}>
        <CtaFields value={primary} onChange={(next) => update({ primaryCta: next })} dict={dict} />
      </Fieldset>
      <Fieldset legend={dict.sections.forms.hero.secondaryCta}>
        <CtaFields
          value={secondary}
          onChange={(next) =>
            update({
              secondaryCta: next.label || next.href ? next : undefined,
            })
          }
          dict={dict}
        />
      </Fieldset>
    </div>
  );
}

function CtaFields({
  value,
  onChange,
  dict,
}: {
  value: Record<string, unknown>;
  onChange: (n: Record<string, unknown>) => void;
  dict: DictMarketing;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={dict.sections.forms.hero.label}>
        <Input
          value={stringValue(value, 'label')}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
      </Field>
      <Field label={dict.sections.forms.hero.href}>
        <Input
          value={stringValue(value, 'href')}
          onChange={(e) => onChange({ ...value, href: e.target.value })}
        />
      </Field>
    </div>
  );
}

// --- feature cards ----------------------------------------------------

function FeatureCardsFields({
  value,
  onChange,
  dict,
}: { value: unknown; onChange: (n: unknown) => void; dict: DictMarketing }) {
  const cards = asArray(asRecord(value).cards) as Record<string, unknown>[];
  const update = (next: Record<string, unknown>[]) => onChange({ cards: next });
  return (
    <ListEditor
      addLabel={dict.sections.forms.featureCards.addCard}
      removeLabel={dict.common.removeRow}
      items={cards}
      onAdd={() => update([...cards, { iconKey: '', title: '', body: '', href: '' }])}
      onRemove={(i) => update(cards.filter((_, idx) => idx !== i))}
      renderItem={(item, i) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={dict.sections.forms.featureCards.iconKey}>
            <Input
              value={stringValue(item, 'iconKey')}
              onChange={(e) =>
                update(cards.map((c, idx) => (idx === i ? { ...c, iconKey: e.target.value } : c)))
              }
            />
          </Field>
          <Field label={dict.sections.forms.featureCards.title}>
            <Input
              value={stringValue(item, 'title')}
              onChange={(e) =>
                update(cards.map((c, idx) => (idx === i ? { ...c, title: e.target.value } : c)))
              }
            />
          </Field>
          <Field label={dict.sections.forms.featureCards.body} className="sm:col-span-2">
            <Textarea
              rows={2}
              value={stringValue(item, 'body')}
              onChange={(e) =>
                update(cards.map((c, idx) => (idx === i ? { ...c, body: e.target.value } : c)))
              }
            />
          </Field>
          <Field label={dict.sections.forms.featureCards.href} className="sm:col-span-2">
            <Input
              value={stringValue(item, 'href')}
              onChange={(e) =>
                update(cards.map((c, idx) => (idx === i ? { ...c, href: e.target.value } : c)))
              }
            />
          </Field>
        </div>
      )}
    />
  );
}

// --- social proof -----------------------------------------------------

function SocialProofFields({
  value,
  onChange,
  dict,
}: { value: unknown; onChange: (n: unknown) => void; dict: DictMarketing }) {
  const stats = asArray(asRecord(value).stats) as Record<string, unknown>[];
  const update = (next: Record<string, unknown>[]) => onChange({ stats: next });
  return (
    <ListEditor
      addLabel={dict.sections.forms.socialProof.addStat}
      removeLabel={dict.common.removeRow}
      items={stats}
      onAdd={() => update([...stats, { value: '', label: '' }])}
      onRemove={(i) => update(stats.filter((_, idx) => idx !== i))}
      renderItem={(item, i) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={dict.sections.forms.socialProof.value}>
            <Input
              value={stringValue(item, 'value')}
              onChange={(e) =>
                update(stats.map((c, idx) => (idx === i ? { ...c, value: e.target.value } : c)))
              }
            />
          </Field>
          <Field label={dict.sections.forms.socialProof.label}>
            <Input
              value={stringValue(item, 'label')}
              onChange={(e) =>
                update(stats.map((c, idx) => (idx === i ? { ...c, label: e.target.value } : c)))
              }
            />
          </Field>
        </div>
      )}
    />
  );
}

// --- testimonials -----------------------------------------------------

function TestimonialsFields({
  value,
  onChange,
  dict,
}: { value: unknown; onChange: (n: unknown) => void; dict: DictMarketing }) {
  const items = asArray(asRecord(value).items) as Record<string, unknown>[];
  const update = (next: Record<string, unknown>[]) => onChange({ items: next });
  return (
    <ListEditor
      addLabel={dict.sections.forms.testimonials.addItem}
      removeLabel={dict.common.removeRow}
      items={items}
      onAdd={() =>
        update([
          ...items,
          { quote: '', authorName: '', authorRole: '', authorCompany: '', avatarUrl: '' },
        ])
      }
      onRemove={(i) => update(items.filter((_, idx) => idx !== i))}
      renderItem={(item, i) => (
        <div className="space-y-3">
          <Field label={dict.sections.forms.testimonials.quote}>
            <Textarea
              rows={3}
              value={stringValue(item, 'quote')}
              onChange={(e) =>
                update(items.map((c, idx) => (idx === i ? { ...c, quote: e.target.value } : c)))
              }
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={dict.sections.forms.testimonials.authorName}>
              <Input
                value={stringValue(item, 'authorName')}
                onChange={(e) =>
                  update(
                    items.map((c, idx) => (idx === i ? { ...c, authorName: e.target.value } : c)),
                  )
                }
              />
            </Field>
            <Field label={dict.sections.forms.testimonials.authorRole}>
              <Input
                value={stringValue(item, 'authorRole')}
                onChange={(e) =>
                  update(
                    items.map((c, idx) => (idx === i ? { ...c, authorRole: e.target.value } : c)),
                  )
                }
              />
            </Field>
            <Field label={dict.sections.forms.testimonials.authorCompany}>
              <Input
                value={stringValue(item, 'authorCompany')}
                onChange={(e) =>
                  update(
                    items.map((c, idx) =>
                      idx === i ? { ...c, authorCompany: e.target.value } : c,
                    ),
                  )
                }
              />
            </Field>
            <Field label={dict.sections.forms.testimonials.avatarUrl}>
              <Input
                value={stringValue(item, 'avatarUrl')}
                onChange={(e) =>
                  update(
                    items.map((c, idx) => (idx === i ? { ...c, avatarUrl: e.target.value } : c)),
                  )
                }
              />
            </Field>
          </div>
        </div>
      )}
    />
  );
}

// --- faq ---------------------------------------------------------------

function FaqFields({
  value,
  onChange,
  dict,
}: { value: unknown; onChange: (n: unknown) => void; dict: DictMarketing }) {
  const items = asArray(asRecord(value).items) as Record<string, unknown>[];
  const update = (next: Record<string, unknown>[]) => onChange({ items: next });
  return (
    <ListEditor
      addLabel={dict.sections.forms.faq.addItem}
      removeLabel={dict.common.removeRow}
      items={items}
      onAdd={() => update([...items, { q: '', a: '' }])}
      onRemove={(i) => update(items.filter((_, idx) => idx !== i))}
      renderItem={(item, i) => (
        <div className="space-y-3">
          <Field label={dict.sections.forms.faq.question}>
            <Input
              value={stringValue(item, 'q')}
              onChange={(e) =>
                update(items.map((c, idx) => (idx === i ? { ...c, q: e.target.value } : c)))
              }
            />
          </Field>
          <Field label={dict.sections.forms.faq.answer}>
            <Textarea
              rows={3}
              value={stringValue(item, 'a')}
              onChange={(e) =>
                update(items.map((c, idx) => (idx === i ? { ...c, a: e.target.value } : c)))
              }
            />
          </Field>
        </div>
      )}
    />
  );
}

// --- footer columns ---------------------------------------------------

function FooterColumnsFields({
  value,
  onChange,
  dict,
}: { value: unknown; onChange: (n: unknown) => void; dict: DictMarketing }) {
  const columns = asArray(asRecord(value).columns) as Record<string, unknown>[];
  const update = (next: Record<string, unknown>[]) => onChange({ columns: next });
  return (
    <ListEditor
      addLabel={dict.sections.forms.footerColumns.addColumn}
      removeLabel={dict.common.removeRow}
      items={columns}
      onAdd={() => update([...columns, { title: '', links: [] }])}
      onRemove={(i) => update(columns.filter((_, idx) => idx !== i))}
      renderItem={(item, i) => {
        const links = asArray(item.links) as Record<string, unknown>[];
        const setLinks = (nextLinks: Record<string, unknown>[]) =>
          update(columns.map((c, idx) => (idx === i ? { ...c, links: nextLinks } : c)));
        return (
          <div className="space-y-3">
            <Field label={dict.sections.forms.footerColumns.title}>
              <Input
                value={stringValue(item, 'title')}
                onChange={(e) =>
                  update(columns.map((c, idx) => (idx === i ? { ...c, title: e.target.value } : c)))
                }
              />
            </Field>
            <div className="space-y-2 rounded-md border border-border/40 p-3">
              <div className="text-xs font-medium text-muted-foreground">
                {dict.sections.forms.footerColumns.links}
              </div>
              {links.map((link, li) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: links are order-only, no stable id
                <div key={li} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    placeholder={dict.sections.forms.footerColumns.label}
                    value={stringValue(link, 'label')}
                    onChange={(e) =>
                      setLinks(
                        links.map((l, idx) => (idx === li ? { ...l, label: e.target.value } : l)),
                      )
                    }
                  />
                  <Input
                    placeholder={dict.sections.forms.footerColumns.href}
                    value={stringValue(link, 'href')}
                    onChange={(e) =>
                      setLinks(
                        links.map((l, idx) => (idx === li ? { ...l, href: e.target.value } : l)),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setLinks(links.filter((_, idx) => idx !== li))}
                    aria-label={dict.common.removeRow}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLinks([...links, { label: '', href: '' }])}
              >
                <Plus className="mr-2 h-4 w-4" />
                {dict.sections.forms.footerColumns.addLink}
              </Button>
            </div>
          </div>
        );
      }}
    />
  );
}

// --- shared helpers ---------------------------------------------------

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2 rounded-md border border-border/40 p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">{legend}</legend>
      {children}
    </fieldset>
  );
}

function ListEditor<T>({
  items,
  onAdd,
  onRemove,
  renderItem,
  addLabel,
  removeLabel,
}: {
  items: ReadonlyArray<T>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  addLabel: string;
  removeLabel: string;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: items are order-only, no stable id
        <div key={i} className="rounded-md border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">#{i + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(i)}
              className="text-muted-foreground"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {removeLabel}
            </Button>
          </div>
          {renderItem(item, i)}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );
}
