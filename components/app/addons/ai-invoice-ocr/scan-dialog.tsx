'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { OcrJobView } from '@/platform/addons/ai-invoice-ocr';
import { Camera, Loader2, RotateCcw, ScanText, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type DragEvent, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export type OcrApplyPayload = NonNullable<OcrJobView['parsed']> & {
  matchedSupplierId: string | null;
  tenantCurrency: string;
};

type State =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'polling'; jobId: string; attempts: number }
  | { kind: 'done'; view: OcrJobView }
  | { kind: 'failed'; message: string };

type Actions = {
  startOcrJob: (
    formData: FormData,
  ) => Promise<{ ok: true; jobId: string } | { ok: false; code: string; message: string }>;
  pollOcrJob: (jobId: string) => Promise<OcrJobView | null>;
};

const POLL_INITIAL_DELAY_MS = 1500;
const POLL_MAX_DELAY_MS = 6000;
const POLL_TIMEOUT_MS = 60_000;

const ALLOWED_INPUT_ACCEPT =
  'image/jpeg,image/jpg,image/png,image/heic,image/heif,image/webp,application/pdf';

/**
 * Scan-dialog: drag-and-drop a supplier invoice image, run it through the
 * Claude vision model, preview the extraction. On apply, calls `onApply`
 * with the parsed payload + matched ids; the parent component is
 * responsible for wiring those into the form state.
 */
export function ScanDialog({
  open,
  onOpenChange,
  actions,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: Actions;
  onApply: (payload: OcrApplyPayload) => void;
}) {
  const t = useTranslations('addons.aiInvoiceOcr');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Reset state when the dialog closes so the next open starts fresh.
  useEffect(() => {
    if (!open) {
      setState({ kind: 'idle' });
    }
  }, [open]);

  const handleFile = useCallback(
    async (file: File) => {
      setState({ kind: 'uploading' });
      const fd = new FormData();
      fd.set('file', file);
      const result = await actions.startOcrJob(fd);
      if (!result.ok) {
        const message =
          result.code === 'invalid_file_type'
            ? t('errors.invalidFileType')
            : result.code === 'file_too_large'
              ? t('errors.fileTooLarge')
              : result.code === 'addon_disabled'
                ? t('errors.addonDisabled')
                : t('errors.uploadFailed');
        toast.error(message);
        setState({ kind: 'failed', message });
        return;
      }
      setState({ kind: 'polling', jobId: result.jobId, attempts: 0 });
    },
    [actions, t],
  );

  // Polling loop. Re-runs whenever `state.kind === 'polling'`.
  useEffect(() => {
    if (state.kind !== 'polling') return;
    const jobId = state.jobId;
    const startedAt = Date.now();
    let cancelled = false;
    let attempt = 0;

    const tick = async () => {
      if (cancelled) return;
      attempt += 1;
      try {
        const view = await actions.pollOcrJob(jobId);
        if (cancelled) return;
        if (!view) {
          setState({ kind: 'failed', message: t('errors.jobMissing') });
          return;
        }
        if (view.status === 'done') {
          setState({ kind: 'done', view });
          return;
        }
        if (view.status === 'failed') {
          setState({
            kind: 'failed',
            message: view.errorMessage ?? t('errors.processingFailed'),
          });
          return;
        }
      } catch {
        if (cancelled) return;
        setState({ kind: 'failed', message: t('errors.pollFailed') });
        return;
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setState({ kind: 'failed', message: t('errors.timeout') });
        return;
      }
      const delay = Math.min(
        POLL_INITIAL_DELAY_MS * 1.4 ** Math.max(0, attempt - 1),
        POLL_MAX_DELAY_MS,
      );
      window.setTimeout(tick, delay);
    };

    window.setTimeout(tick, POLL_INITIAL_DELAY_MS);
    return () => {
      cancelled = true;
    };
  }, [state, actions, t]);

  const onPickFromInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // Reset the input so re-selecting the same file fires onChange again.
    e.target.value = '';
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const reset = () => {
    setState({ kind: 'idle' });
  };

  const apply = () => {
    if (state.kind !== 'done' || !state.view.parsed) return;
    onApply({
      ...state.view.parsed,
      matchedSupplierId: state.view.matchedSupplierId,
      tenantCurrency: state.view.tenantCurrency,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanText className="size-5" aria-hidden />
            {t('dialogTitle')}
          </DialogTitle>
          <DialogDescription>{t('dialogDescription')}</DialogDescription>
        </DialogHeader>

        {state.kind === 'idle' ? (
          <label
            htmlFor="ocr-file-input"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={[
              'flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-border',
            ].join(' ')}
          >
            <Upload className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-medium text-foreground">{t('dragDropCopy')}</p>
            <p className="text-xs">{t('dragDropHint')}</p>
            <input
              ref={fileInputRef}
              id="ocr-file-input"
              type="file"
              accept={ALLOWED_INPUT_ACCEPT}
              className="sr-only"
              onChange={onPickFromInput}
            />
          </label>
        ) : null}

        {state.kind === 'uploading' || state.kind === 'polling' ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            <p className="font-medium text-foreground">
              {state.kind === 'uploading' ? t('uploadingTitle') : t('processingTitle')}
            </p>
            <p className="text-sm text-muted-foreground">{t('processingHint')}</p>
          </div>
        ) : null}

        {state.kind === 'done' ? <ParsedPreview view={state.view} /> : null}

        {state.kind === 'failed' ? (
          <Alert variant="destructive" className="my-2">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter className="gap-2">
          {state.kind === 'failed' ? (
            <Button type="button" variant="outline" onClick={reset}>
              <RotateCcw className="mr-2 size-4" aria-hidden />
              {t('retry')}
            </Button>
          ) : null}
          {state.kind === 'done' ? (
            <>
              <Button type="button" variant="ghost" onClick={reset}>
                <Camera className="mr-2 size-4" aria-hidden />
                {t('scanAnother')}
              </Button>
              <Button type="button" onClick={apply}>
                {t('apply')}
              </Button>
            </>
          ) : null}
          {state.kind === 'idle' ? (
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ParsedPreview({ view }: { view: OcrJobView }) {
  const t = useTranslations('addons.aiInvoiceOcr');
  const parsed = view.parsed;
  if (!parsed) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  const unmatchedLines = parsed.lines.filter((l) => l.matchedProductId === null).length;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex items-center justify-center overflow-hidden rounded-md border bg-muted/30">
        {view.imageUrl ? (
          <img
            src={view.imageUrl}
            alt={t('previewAlt')}
            className="max-h-96 w-full object-contain"
          />
        ) : (
          <p className="p-4 text-sm text-muted-foreground">{t('noPreview')}</p>
        )}
      </div>
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {t('confidence', { value: Math.round((parsed.confidence ?? 0) * 100) })}
          </Badge>
          {unmatchedLines > 0 ? (
            <Badge variant="outline">{t('unmatchedCount', { count: unmatchedLines })}</Badge>
          ) : null}
        </div>
        <PreviewField label={t('parsed.supplier')} value={parsed.supplierName} />
        <PreviewField label={t('parsed.inn')} value={parsed.supplierInn} />
        <PreviewField label={t('parsed.number')} value={parsed.invoiceNumber} />
        <PreviewField label={t('parsed.date')} value={parsed.invoiceDate} />
        <PreviewField
          label={t('parsed.currency')}
          value={parsed.currency ?? `${view.tenantCurrency} (${t('parsed.currencyFallback')})`}
        />
        <PreviewField
          label={t('parsed.total')}
          value={parsed.totalAmount !== null ? parsed.totalAmount.toLocaleString() : null}
        />
        <div>
          <p className="mb-1 font-medium text-foreground">{t('parsed.lines')}</p>
          <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto text-xs">
            {parsed.lines.map((l, idx) => (
              <li
                key={`${l.description}-${idx}`}
                className={[
                  'rounded border px-2 py-1',
                  l.matchedProductId ? 'border-border' : 'border-amber-500/40 bg-amber-500/5',
                ].join(' ')}
              >
                <div className="font-medium text-foreground">{l.description || l.rawText}</div>
                <div className="text-muted-foreground">
                  {l.quantity ?? '—'} {l.unit ?? ''} × {l.unitPrice ?? '—'} = {l.total ?? '—'}
                  {!l.matchedProductId ? (
                    <span className="ml-1 text-amber-700 dark:text-amber-400">
                      • {t('unmatchedHint')}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">
        {value ?? <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}
