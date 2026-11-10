'use client';

import {
  createProductsBulk,
  parseProductsXlsx,
} from '@/app/[locale]/(app)/catalogs/[entity]/actions';
import { postCloseMe } from '@/components/app/tabs/tab-bridge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

const INITIAL_ROWS = 5;

const ERROR_TOKEN_MAP: Record<string, string> = {
  noFile: 'errorNoFile',
  invalidXlsx: 'errorInvalidXlsx',
  emptyWorkbook: 'errorEmptyWorkbook',
};

export function BulkProductForm({
  locale,
  templateHref,
}: {
  locale: string;
  templateHref: string;
}) {
  const t = useTranslations('catalog.bulkProducts');
  const tCatalog = useTranslations('catalog');
  const [rows, setRows] = useState<string[]>(() => Array.from({ length: INITIAL_ROWS }, () => ''));
  const [message, setMessage] = useState<
    { kind: 'success'; count: number } | { kind: 'error'; text: string } | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filledCount = rows.filter((r) => r.trim().length > 0).length;

  function setRow(idx: number, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, '']);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function onSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await createProductsBulk(locale, rows);
      if (!result.ok) {
        const token = result.formError ?? 'errorGeneric';
        setMessage({ kind: 'error', text: tCatalog.has(token) ? tCatalog(token) : token });
        return;
      }
      setMessage({ kind: 'success', count: result.createdCount });
      if (!result.redirectTo) return;
      // Inside a tab iframe, ask the parent to close this tab (parent owns the
      // TabsProvider + refresh). Navigating the iframe itself would reload the
      // whole app layout inside the chip ("duplicate sidebar" bug).
      const inIframe = typeof window !== 'undefined' && window.parent !== window;
      if (inIframe) {
        postCloseMe('save-and-close');
      } else {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  }

  function onImportPick(file: File) {
    setMessage(null);
    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      const result = await parseProductsXlsx(fd);
      if (!result.ok) {
        const token = ERROR_TOKEN_MAP[result.formError] ?? 'errorEmptyWorkbook';
        setMessage({ kind: 'error', text: t(token) });
        return;
      }
      const names = result.names;
      const padded =
        names.length < INITIAL_ROWS
          ? [...names, ...Array.from({ length: INITIAL_ROWS - names.length }, () => '')]
          : names;
      setRows(padded);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            accept=".xlsx"
            ref={fileRef}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportPick(f);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t('importXlsx')}
          </Button>
          <a href={templateHref} download className={buttonVariants({ variant: 'outline' })}>
            <Download className="mr-2 h-4 w-4" />
            {t('downloadTemplate')}
          </a>
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((value, idx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are position-identified; no stable id exists
            <div key={idx} className="flex items-center gap-2">
              <span className="w-8 text-right text-sm tabular-nums text-muted-foreground">
                {idx + 1}.
              </span>
              <Input
                value={value}
                onChange={(e) => setRow(idx, e.target.value)}
                placeholder={t('namePlaceholder')}
                className="flex-1"
                disabled={isPending}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(idx)}
                disabled={isPending || rows.length <= 1}
                aria-label={t('removeRow')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={addRow} disabled={isPending}>
            <Plus className="mr-2 h-4 w-4" />
            {t('addRow')}
          </Button>
          <Button type="button" onClick={onSave} disabled={isPending || filledCount === 0}>
            {t('save', { count: filledCount })}
          </Button>
        </div>

        {message?.kind === 'success' && (
          <p className="text-sm text-primary">{t('savedCount', { count: message.count })}</p>
        )}
        {message?.kind === 'error' && <p className="text-sm text-destructive">{message.text}</p>}
      </CardContent>
    </Card>
  );
}
