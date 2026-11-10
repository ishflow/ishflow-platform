'use client';

import { useTranslations } from 'next-intl';

type SeriesRow = {
  docTypeKey: string;
  prefix: string;
  startCounter: number;
  format: string;
  resetKey: 'yearly' | 'monthly' | 'never';
  preview: string;
};

const ROWS: SeriesRow[] = [
  {
    docTypeKey: 'salesInvoice',
    prefix: 'SALE-',
    startCounter: 35,
    format: '{prefix}{YYYY}-{0000}',
    resetKey: 'never',
    preview: 'SALE-2026-0035',
  },
  {
    docTypeKey: 'purchaseInvoice',
    prefix: 'INV-',
    startCounter: 13,
    format: '{prefix}{YYYY}-{000000}',
    resetKey: 'yearly',
    preview: 'INV-2026-000013',
  },
  {
    docTypeKey: 'paymentReceived',
    prefix: 'PAY-IN-',
    startCounter: 219,
    format: '{prefix}{000000}',
    resetKey: 'never',
    preview: 'PAY-IN-000219',
  },
  {
    docTypeKey: 'paymentSent',
    prefix: 'PAY-OUT-',
    startCounter: 90,
    format: '{prefix}{000000}',
    resetKey: 'never',
    preview: 'PAY-OUT-000090',
  },
  {
    docTypeKey: 'stockIn',
    prefix: 'STK-IN-',
    startCounter: 48,
    format: '{prefix}{YYYY}{MM}-{0000}',
    resetKey: 'monthly',
    preview: 'STK-IN-202605-0048',
  },
  {
    docTypeKey: 'stockOut',
    prefix: 'STK-OUT-',
    startCounter: 124,
    format: '{prefix}{YYYY}{MM}-{0000}',
    resetKey: 'monthly',
    preview: 'STK-OUT-202605-0124',
  },
  {
    docTypeKey: 'deliveryNote',
    prefix: 'DLV-',
    startCounter: 13,
    format: '{prefix}{0000}',
    resetKey: 'yearly',
    preview: 'DLV-0013',
  },
  {
    docTypeKey: 'inventoryCount',
    prefix: 'STK-CNT-',
    startCounter: 5,
    format: '{prefix}{YYYY}-{0000}',
    resetKey: 'yearly',
    preview: 'STK-CNT-2026-0005',
  },
  {
    docTypeKey: 'adjustment',
    prefix: 'ADJ-',
    startCounter: 14,
    format: '{prefix}{YYYY}Q{Q}-{000}',
    resetKey: 'yearly',
    preview: 'ADJ-2026Q2-014',
  },
];

export function V2NumberSeriesPage() {
  const t = useTranslations('v2_documents_extra.numberSeries');

  return (
    <>
      <div className="dim" style={{ fontSize: 12.5, marginBottom: 14 }}>
        {t.rich('hint', {
          tk: (chunks) => <span className="mono">{chunks}</span>,
        })}
      </div>

      <section className="card" style={{ padding: 0 }}>
        <div className="series-row head">
          <div>{t('cols.docType')}</div>
          <div>{t('cols.prefix')}</div>
          <div>{t('cols.startCounter')}</div>
          <div>{t('cols.format')}</div>
          <div>{t('cols.resetFrequency')}</div>
          <div>{t('cols.nextPreview')}</div>
        </div>
        {ROWS.map((r) => (
          <div key={r.docTypeKey} className="series-row">
            <div className="doc">
              {t(`docTypes.${r.docTypeKey}.title`)}
              <div className="sub">{t(`docTypes.${r.docTypeKey}.sub`)}</div>
            </div>
            <div>
              <input className="input mono" defaultValue={r.prefix} />
            </div>
            <div>
              <input className="input mono" defaultValue={r.startCounter} />
            </div>
            <div>
              <input className="input mono" defaultValue={r.format} />
            </div>
            <div>
              <select className="select reset-select" defaultValue={r.resetKey}>
                <option value="yearly">{t('reset.yearly')}</option>
                <option value="monthly">{t('reset.monthly')}</option>
                <option value="never">{t('reset.never')}</option>
              </select>
            </div>
            <div>
              <span className="preview mono">{r.preview}</span>
            </div>
          </div>
        ))}
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">{t('collision.title')}</div>
        </div>
        <div className="form-grid">
          <span className="form-grid-label">{t('collision.gapFill')}</span>
          <div className="field">
            <div
              className="chip-row"
              style={{ background: 'transparent', border: 'none', padding: 0 }}
            >
              <button type="button" className="chip is-active">
                {t('collision.gapFillNo')}
              </button>
              <button type="button" className="chip">
                {t('collision.gapFillYes')}
              </button>
            </div>
            <div className="field-hint">{t('collision.gapFillHint')}</div>
          </div>

          <span className="form-grid-label">{t('collision.manualAssign')}</span>
          <div className="field">
            <div
              className="chip-row"
              style={{ background: 'transparent', border: 'none', padding: 0 }}
            >
              <button type="button" className="chip">
                {t('collision.manualOff')}
              </button>
              <button type="button" className="chip is-active">
                {t('collision.manualOn')}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
