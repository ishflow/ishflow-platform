'use client';

import { parseUploadAction, runImportAction } from '@/app/[locale]/(app)/admin/import/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FIELD_DESCRIPTORS, type ImportEntity, suggestHeaderMapping } from '@/platform/import';
import { useTranslations } from 'next-intl';
import { useMemo, useState, useTransition } from 'react';
import { ColumnMapper } from './column-mapper';
import { ErrorList } from './error-list';
import { PreviewTable } from './preview-table';
import { UploadZone } from './upload-zone';

type Step = 'upload' | 'map' | 'preview' | 'done';

export function ImportShell() {
  const t = useTranslations('admin.import');
  const [step, setStep] = useState<Step>('upload');
  const [entity, setEntity] = useState<ImportEntity>('customer');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    inserted: number;
    skipped: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const descriptors = FIELD_DESCRIPTORS[entity];

  const mappedRows = useMemo(() => {
    return rows.map((r) => {
      const out: Record<string, string> = {};
      for (const [source, target] of Object.entries(mapping)) {
        if (target && r[source] !== undefined) out[target] = r[source];
      }
      return out;
    });
  }, [rows, mapping]);

  const requiredMissing = descriptors
    .filter((d) => d.required)
    .filter((d) => !Object.values(mapping).includes(d.key))
    .map((d) => d.key);

  const handleFile = (file: File) => {
    setServerError(null);
    startTransition(async () => {
      try {
        const parsed = await parseUploadAction(file);
        const firstError = parsed.errors[0];
        if (firstError) {
          setServerError(firstError.message);
          return;
        }
        setHeaders(parsed.headers);
        setRows(parsed.rows);
        const suggestion = suggestHeaderMapping(parsed.headers, descriptors);
        setMapping(suggestion);
        setStep('map');
      } catch (err) {
        setServerError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  const handleImport = () => {
    setServerError(null);
    startTransition(async () => {
      try {
        const out = await runImportAction({ entity, rows: mappedRows });
        setResult(out);
        setStep('done');
      } catch (err) {
        setServerError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  const reset = () => {
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
    setServerError(null);
    setStep('upload');
  };

  return (
    <div className="flex flex-col gap-4">
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('selectEntity')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="entity-select">{t('selectEntity')}</Label>
              <Select value={entity} onValueChange={(v) => setEntity(v as ImportEntity)}>
                <SelectTrigger id="entity-select" className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">{t('entityCustomer')}</SelectItem>
                  <SelectItem value="product">{t('entityProduct')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <UploadZone onFile={handleFile} />
            {serverError && (
              <Alert variant="destructive">
                <AlertTitle>{t('errorParseFailed')}</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'map' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('mappingTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{t('mappingSubtitle')}</p>
            <ColumnMapper
              headers={headers}
              descriptors={descriptors}
              mapping={mapping}
              onChange={setMapping}
            />
            {requiredMissing.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  {requiredMissing.map((field) => t('errorRequiredMissing', { field })).join(' ')}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>
                {t('back')}
              </Button>
              <Button onClick={() => setStep('preview')} disabled={requiredMissing.length > 0}>
                {t('previewTitle')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('previewTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{t('previewSubtitle')}</p>
            <PreviewTable rows={mappedRows.slice(0, 10)} fields={descriptors.map((d) => d.key)} />
            <p className="text-sm">{t('confirmBody', { ok: mappedRows.length, bad: 0 })}</p>
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('map')}>
                {t('back')}
              </Button>
              <Button onClick={handleImport} disabled={isPending}>
                {t('importBtn')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'done' && result && (
        <Card>
          <CardHeader>
            <CardTitle>{t('successTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p>
              {t('successBody', {
                inserted: result.inserted,
                skipped: result.skipped,
                errors: result.errors.length,
              })}
            </p>
            {result.errors.length > 0 && <ErrorList errors={result.errors} />}
            <Button onClick={reset}>{t('cancelBtn')}</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
