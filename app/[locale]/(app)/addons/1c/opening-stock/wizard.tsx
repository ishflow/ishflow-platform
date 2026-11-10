'use client';

import type {
  OpeningStockInput,
  OpeningStockResult,
} from '@/platform/addons/1c-import/opening-stock';
import { Download, FileText, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import { parseOpeningStockAction, runOpeningStockAction } from './actions';

type Labels = Record<string, string>;
type Step = 1 | 2 | 3;
type Warehouse = { id: string; name: string };
type Parsed = {
  rows: OpeningStockInput[];
  errors: { row: number; message: string }[];
  total: number;
};

// Quote a CSV cell and neutralize spreadsheet formula injection: a value
// starting with = + - @ (or tab/CR) is prefixed with ' so Excel/Sheets treat
// it as text. Error messages can echo 1C-sourced names, so this is untrusted.
function csvCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}

function buildErrorCsv(errors: { row: number; message: string }[]): string {
  const lines = ['row,message'];
  for (const e of errors) {
    lines.push(`${e.row},${csvCell(e.message)}`);
  }
  return lines.join('\n');
}

export function OpeningStockWizard({
  warehouses,
  labels: t,
}: {
  warehouses: Warehouse[];
  labels: Labels;
}) {
  const [step, setStep] = useState<Step>(1);
  const [warehouseId, setWarehouseId] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [result, setResult] = useState<OpeningStockResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File) => {
    setError(null);
    startTransition(async () => {
      try {
        const out = await parseOpeningStockAction(file);
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
        const out = await runOpeningStockAction({ warehouseId, rows: parsed.rows });
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
    setWarehouseId('');
    setStep(1);
  };

  const downloadCsv = () => {
    if (!result) return;
    const blob = new Blob([buildErrorCsv(result.errors)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'opening-stock-errors.csv';
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
          {warehouses.length === 0 ? (
            <p className="dim" style={{ fontSize: 13 }}>
              {t.noWarehouses}
            </p>
          ) : (
            <>
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="form-label">{t.warehouseLabel}</div>
                <div className="field">
                  <select
                    className="select"
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    required
                  >
                    <option value="">{t.chooseWarehouse}</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                className="drop-zone"
                onClick={() => fileRef.current?.click()}
                disabled={!warehouseId}
                style={{ width: '100%', cursor: warehouseId ? 'pointer' : 'not-allowed' }}
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
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
            </>
          )}
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
                {t.parsed}: <strong>{parsed.rows.length}</strong>
              </span>
            </li>
            <li>
              <FileText size={14} strokeWidth={2} />
              <span>
                {t.errors}: <strong>{parsed.errors.length}</strong>
              </span>
            </li>
          </ul>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              {t.back}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onRun}
              disabled={pending || parsed.rows.length === 0}
            >
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
          <ul className="feature-list">
            <li>
              <span>
                {result.posted} {t.posted}
              </span>
            </li>
            <li>
              <span>
                {result.skipped} {t.skipped}
              </span>
            </li>
            <li>
              <span>
                {result.errors.length} {t.failed}
              </span>
            </li>
          </ul>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            {result.errors.length > 0 ? (
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
