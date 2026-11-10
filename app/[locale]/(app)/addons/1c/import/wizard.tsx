'use client';

import { Download, FileText, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import {
  type CounterpartyTarget,
  type Parse1cResult,
  type Run1cImportResult,
  parse1cUploadAction,
  run1cImportAction,
} from './actions';

type Labels = Record<string, string>;
type Step = 1 | 2 | 3;

// Quote a CSV cell and neutralize spreadsheet formula injection: a value
// starting with = + - @ (or tab/CR) is prefixed with ' so Excel/Sheets treat
// it as text. Error messages can echo 1C-sourced names, so this is untrusted.
function csvCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}

function buildErrorCsv(result: Run1cImportResult): string {
  const lines = ['entity,row,message'];
  const push = (entity: string, r: { errors: { row: number; message: string }[] } | null) => {
    if (!r) return;
    for (const e of r.errors) {
      lines.push(`${entity},${e.row},${csvCell(e.message)}`);
    }
  };
  push('product', result.product);
  push('customer', result.customer);
  push('supplier', result.supplier);
  return lines.join('\n');
}

function totals(result: Run1cImportResult) {
  const parts = [result.product, result.customer, result.supplier].filter(Boolean) as {
    inserted: number;
    skipped: number;
    errors: unknown[];
  }[];
  return {
    inserted: parts.reduce((s, p) => s + p.inserted, 0),
    skipped: parts.reduce((s, p) => s + p.skipped, 0),
    failed: parts.reduce((s, p) => s + p.errors.length, 0),
  };
}

export function OneCImportWizard({ labels: t }: { labels: Labels }) {
  const [step, setStep] = useState<Step>(1);
  const [parsed, setParsed] = useState<Parse1cResult | null>(null);
  const [target, setTarget] = useState<CounterpartyTarget>('customers');
  const [result, setResult] = useState<Run1cImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File) => {
    setError(null);
    startTransition(async () => {
      try {
        const out = await parse1cUploadAction(file);
        setParsed(out);
        setStep(2);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const onRun = () => {
    if (!parsed) return;
    setError(null);
    startTransition(async () => {
      try {
        const out = await run1cImportAction({
          products: parsed.products,
          counterparties: parsed.counterparties,
          counterpartyTarget: target,
        });
        setResult(out);
        setStep(3);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const reset = () => {
    setParsed(null);
    setResult(null);
    setError(null);
    setTarget('customers');
    setStep(1);
  };

  const downloadCsv = () => {
    if (!result) return;
    const blob = new Blob([buildErrorCsv(result)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '1c-import-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {error ? (
        <section className="card" style={{ borderColor: 'var(--danger, #e5484d)' }}>
          <p style={{ color: 'var(--danger, #e5484d)', fontSize: 13 }}>{error}</p>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="card">
          <div className="card-header">
            <div className="card-title">{t.step1}</div>
          </div>
          <button
            type="button"
            className="drop-zone"
            onClick={() => fileRef.current?.click()}
            style={{ width: '100%', cursor: 'pointer' }}
          >
            <div className="ico">
              <Upload size={20} strokeWidth={1.75} />
            </div>
            <div className="label">{t.dropTitle}</div>
            <div className="dim" style={{ fontSize: 12, marginTop: 6 }}>
              {t.dropMeta}
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
          {pending ? (
            <p className="dim" style={{ fontSize: 12, marginTop: 12 }}>
              {t.parsing}
            </p>
          ) : null}
        </section>
      ) : null}

      {step === 2 && parsed ? (
        <section className="card">
          <div className="card-header">
            <div className="card-title">{t.step2}</div>
          </div>
          <ul className="feature-list">
            <li>
              <FileText size={14} strokeWidth={2} />
              <span>
                {t.foundProducts}: <strong>{parsed.products.length}</strong>
              </span>
            </li>
            <li>
              <FileText size={14} strokeWidth={2} />
              <span>
                {t.foundCounterparties}: <strong>{parsed.counterparties.length}</strong>
              </span>
            </li>
            {parsed.warnings.length ? (
              <li>
                <FileText size={14} strokeWidth={2} />
                <span>
                  {t.warnings}: <strong>{parsed.warnings.length}</strong>
                </span>
              </li>
            ) : null}
          </ul>

          {parsed.counterparties.length ? (
            <div className="form-grid" style={{ marginTop: 16 }}>
              <div className="form-label">{t.targetLabel}</div>
              <div className="field">
                <select
                  className="select"
                  value={target}
                  onChange={(e) => setTarget(e.target.value as CounterpartyTarget)}
                >
                  <option value="customers">{t.targetCustomers}</option>
                  <option value="suppliers">{t.targetSuppliers}</option>
                  <option value="both">{t.targetBoth}</option>
                </select>
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              {t.back}
            </button>
            <button type="button" className="btn btn-primary" onClick={onRun} disabled={pending}>
              {pending ? t.importing : t.runImport}
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 && result ? (
        <section className="card">
          <div className="card-header">
            <div className="card-title">{t.resultTitle}</div>
          </div>
          {(() => {
            const tot = totals(result);
            return (
              <ul className="feature-list">
                <li>
                  <span>
                    {tot.inserted} {t.inserted}
                  </span>
                </li>
                <li>
                  <span>
                    {tot.skipped} {t.skipped}
                  </span>
                </li>
                <li>
                  <span>
                    {tot.failed} {t.failed}
                  </span>
                </li>
              </ul>
            );
          })()}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            {totals(result).failed > 0 ? (
              <button type="button" className="btn btn-secondary" onClick={downloadCsv}>
                <Download size={14} strokeWidth={1.75} />
                {t.downloadErrors}
              </button>
            ) : null}
            <button type="button" className="btn btn-ghost" onClick={reset}>
              <RotateCcw size={14} strokeWidth={1.75} />
              {t.startOver}
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
