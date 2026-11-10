'use client';

import { Link } from '@/platform/i18n/navigation';
import { Camera, ChevronDown, FileText, Sparkles, Upload, UploadCloud, X, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { V2DatePicker } from '../../shared/V2DatePicker';

export type PurchaseInvoiceQuickProps = {
  listHref: string;
  classicHref: string;
};

export function V2PurchaseInvoiceQuick({ listHref, classicHref }: PurchaseInvoiceQuickProps) {
  const t = useTranslations('v2_documents_extra.purchaseInvoice.quick');

  return (
    <>
      <div className="action-bar">
        <div className="left">
          <Link href={listHref} className="btn btn-ghost">
            {t('close')}
          </Link>
          <Link href={classicHref} className="btn btn-secondary">
            <FileText size={14} strokeWidth={1.75} />
            {t('switchToClassic')}
          </Link>
        </div>
        <div className="right">{t('kbdHint')}</div>
      </div>

      <div className="wizard">
        <section className="card step-rail">
          <div className="step-row is-active">
            <div className="num">1</div>
            <div className="body">
              <div className="lbl">{t('step1.title')}</div>
              <div className="sub">{t('step1.sub')}</div>
            </div>
          </div>
          <div className="step-row">
            <div className="num">2</div>
            <div className="body">
              <div className="lbl">{t('step2.title')}</div>
              <div className="sub">{t('step2.sub')}</div>
            </div>
          </div>
          <div className="step-row">
            <div className="num">3</div>
            <div className="body">
              <div className="lbl">{t('step3.title')}</div>
              <div className="sub">{t('step3.sub')}</div>
            </div>
          </div>
          <div className="spacer" />
          <div className="dim" style={{ fontSize: 11.5, lineHeight: 1.5, padding: '0 12px' }}>
            {t('hint')}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div className="card-title">{t('formTitle')}</div>
          </div>

          <div className="form-grid">
            <label htmlFor="v2-purch-quick-date">{t('fields.date')}</label>
            <div className="field">
              <V2DatePicker
                id="v2-purch-quick-date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                ariaLabel={t('fields.date')}
              />
            </div>

            <label htmlFor="v2-purch-quick-supplier">
              {t('fields.supplier')} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div className="field">
              <button id="v2-purch-quick-supplier" type="button" className="combobox-trigger">
                <span className="lbl">{t('fields.supplierPlaceholder')}</span>
                <ChevronDown size={14} strokeWidth={1.75} />
              </button>
            </div>

            <label htmlFor="v2-purch-quick-warehouse">{t('fields.warehouse')}</label>
            <div className="field">
              <select id="v2-purch-quick-warehouse" className="select">
                <option>{t('fields.warehousePlaceholder')}</option>
              </select>
            </div>
          </div>

          <div className="spacer" />

          <div className="drop-zone">
            <div className="ico" style={{ width: 44, height: 44 }}>
              <UploadCloud size={28} strokeWidth={1.5} />
            </div>
            <h3>{t('drop.title')}</h3>
            <div className="meta">{t('drop.meta')}</div>
            <div
              style={{
                marginTop: 14,
                display: 'flex',
                gap: 8,
                justifyContent: 'center',
              }}
            >
              <button type="button" className="btn btn-secondary btn-sm">
                <Upload size={14} strokeWidth={1.75} />
                {t('drop.selectFile')}
              </button>
              <button type="button" className="btn btn-secondary btn-sm">
                <Camera size={14} strokeWidth={1.75} />
                {t('drop.takePhoto')}
              </button>
            </div>
          </div>

          <div className="attach-list" style={{ marginTop: 14 }}>
            <div className="attach">
              <div className="ico">
                <FileText size={14} strokeWidth={1.75} />
              </div>
              <div className="info">
                <div className="name">{t('attachment.exampleName')}</div>
                <div className="meta">
                  {t('attachment.exampleMeta')}{' '}
                  <span className="pill pill-success" style={{ fontSize: 10.5, marginLeft: 6 }}>
                    {t('attachment.completed')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="ocr-hint">
            <span className="ico" style={{ width: 18, height: 18 }}>
              <Sparkles size={14} strokeWidth={1.75} />
            </span>
            <div>
              <strong>{t('ocr.title')}</strong> {t('ocr.body')}
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <button type="button" className="btn btn-primary">
              <Zap size={14} strokeWidth={1.75} />
              {t('ocr.apply')}
            </button>
            <button type="button" className="btn btn-secondary btn-sm">
              <X size={14} strokeWidth={1.75} />
              {t('ocr.reject')}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
