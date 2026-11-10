'use client';

import { PartnerBalanceBadge } from '@/components/app/partner-balance-badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Locale, ReferenceFieldConfig } from '@/platform/metadata';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { EntityForm } from './entity-form';
import { useInlineCreate } from './inline-create-provider';

type Row = { id: string; label: string };

/**
 * Metadata-driven reference picker. Renders a shadcn Popover whose trigger
 * shows the resolved label of the currently selected UUID, and whose
 * content hosts a Command (combobox) that searches the target catalog via
 * /api/reference/search. Selection writes the row id back to the form.
 *
 * If an InlineCreateProvider is mounted, the popover also offers a
 * "+ New" footer that opens a Dialog with the target catalog's create
 * form. Submitting it auto-selects the new record.
 */
export function ReferenceField({
  name,
  id,
  cfg,
  placeholder,
  filter,
  disabled,
  showBalance,
  balanceType,
  locale,
  currency,
}: {
  name: string;
  id: string;
  cfg: ReferenceFieldConfig;
  placeholder: string;
  filter?: Record<string, string>;
  disabled?: boolean;
  showBalance?: boolean;
  balanceType?: 'customer' | 'supplier';
  locale?: Locale;
  currency?: string;
}) {
  const { watch, setValue } = useFormContext();
  const value: string = (watch(name) as string | null | undefined) ?? '';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Row[]>([]);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [inlineOpen, setInlineOpen] = useState(false);
  const filterKey = JSON.stringify(filter ?? {});

  const tCatalog = useTranslations('catalog');
  const tCommon = useTranslations('common');
  const tForm = useTranslations('form');

  const module = cfg.to.module;
  const target = cfg.to.name;
  const targetId = `${module}.${target}`;

  const inlineCreate = useInlineCreate();
  const inlineConfig = inlineCreate.getConfig(targetId);
  const inlineLocale: Locale = inlineCreate.locale ?? 'en';
  const targetLabel = inlineConfig?.label[inlineLocale] ?? inlineConfig?.label.en ?? target;
  const inlineDisplayField =
    inlineConfig?.displayField ?? (inlineConfig ? Object.keys(inlineConfig.fields)[0] : null);

  useEffect(() => {
    if (!value) {
      setCurrentLabel(null);
      return;
    }
    const ctrl = new AbortController();
    const filterObj = JSON.parse(filterKey) as Record<string, string>;
    const params = new URLSearchParams({ module, name: target, id: value });
    for (const [k, v] of Object.entries(filterObj)) params.set(k, v);
    const url = `/api/reference/resolve?${params.toString()}`;
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((row: Row | null) => {
        if (row && typeof row.label === 'string') {
          setCurrentLabel(row.label);
        } else {
          setCurrentLabel(null);
          if (Object.keys(filterObj).length > 0) {
            setValue(name, '', { shouldDirty: true, shouldValidate: true });
          }
        }
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [value, module, target, filterKey, setValue, name]);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      setSearching(true);
      const filterObj = JSON.parse(filterKey) as Record<string, string>;
      const params = new URLSearchParams({ module, name: target, q: query });
      for (const [k, v] of Object.entries(filterObj)) params.set(k, v);
      const url = `/api/reference/search?${params.toString()}`;
      fetch(url, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then((rows: Row[]) => setResults(Array.isArray(rows) ? rows : []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 200);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open, module, target, filterKey]);

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Popover open={open} onOpenChange={disabled ? () => {} : setOpen}>
            <PopoverTrigger
              id={id}
              disabled={disabled}
              render={
                <Button
                  variant="outline"
                  type="button"
                  aria-expanded={open}
                  disabled={disabled}
                  className={cn(
                    'w-full justify-between font-normal',
                    !currentLabel && 'text-muted-foreground',
                  )}
                >
                  {currentLabel ?? placeholder}
                </Button>
              }
            />
            <PopoverPrimitive.Portal>
              <PopoverPrimitive.Positioner
                align="start"
                side="bottom"
                sideOffset={4}
                collisionAvoidance={{ side: 'none', align: 'shift', fallbackAxisSide: 'none' }}
                className="isolate z-50"
              >
                <PopoverPrimitive.Popup
                  data-slot="popover-content"
                  className="z-50 w-[--anchor-width] max-h-[var(--available-height)] origin-(--transform-origin) rounded-lg bg-popover p-0 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={placeholder}
                      value={query}
                      onValueChange={setQuery}
                    />
                    <CommandList>
                      {searching && <CommandEmpty>…</CommandEmpty>}
                      {!searching && results.length === 0 && <CommandEmpty>—</CommandEmpty>}
                      <CommandGroup>
                        {results.map((row) => (
                          <CommandItem
                            key={row.id}
                            value={row.id}
                            onSelect={() => {
                              setValue(name, row.id, { shouldDirty: true, shouldValidate: true });
                              setCurrentLabel(row.label);
                              setOpen(false);
                            }}
                          >
                            {row.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {inlineConfig && (
                        <CommandGroup>
                          <CommandItem
                            value="__inline_create__"
                            onSelect={() => {
                              if (disabled) return;
                              setOpen(false);
                              setInlineOpen(true);
                            }}
                            className="text-primary"
                          >
                            <Plus className="size-4" />
                            {tCatalog('createInlineSubmit')}
                          </CommandItem>
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverPrimitive.Popup>
              </PopoverPrimitive.Positioner>
            </PopoverPrimitive.Portal>
          </Popover>
        </div>
        {showBalance && balanceType && locale && currency && (
          <PartnerBalanceBadge
            type={balanceType}
            partnerId={value || null}
            locale={locale}
            currency={currency}
          />
        )}
      </div>

      {inlineConfig && inlineDisplayField && (
        <Dialog open={inlineOpen} onOpenChange={setInlineOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{tCatalog('createInlineTitle', { entity: targetLabel })}</DialogTitle>
            </DialogHeader>
            <EntityForm
              config={inlineConfig}
              locale={inlineLocale}
              cancelLabel={tCommon('cancel')}
              onCancel={() => setInlineOpen(false)}
              onSubmit={(values) => inlineCreate.submit(targetId, values)}
              submitLabel={tForm('create')}
              savingLabel={tForm('creating')}
              savedMessage={tCatalog('created')}
              onSuccess={(data) => {
                const newId = String(data.id ?? '');
                if (!newId) return;
                setValue(name, newId, { shouldDirty: true, shouldValidate: true });
                const labelField = inlineDisplayField;
                const newLabel = data[labelField];
                setCurrentLabel(typeof newLabel === 'string' ? newLabel : newId.slice(0, 8));
                setInlineOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
