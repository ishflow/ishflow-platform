import { Paperclip, Upload } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

/**
 * Variant-9 mockup parity: attachments aside card. Real upload UX is
 * deferred — this is an empty-state placeholder with disabled Yükle btn.
 * Generic across documents (sales invoice, purchase invoice, …) since the
 * content is identical in every variant-9 mockup.
 */
export async function DocumentAttachmentsCard() {
  const t = await getTranslations('v2_documents.new.attachments');
  return (
    <section className="card">
      <div className="card-header">
        <div className="card-title">{t('title')}</div>
        <button type="button" className="btn btn-secondary btn-sm" disabled>
          <Upload size={14} strokeWidth={1.75} />
          {t('upload')}
        </button>
      </div>
      <div className="attach-list">
        <div className="attach">
          <div className="ico">
            <Paperclip size={14} strokeWidth={1.75} />
          </div>
          <div className="info">
            <div className="name">{t('empty')}</div>
            <div className="meta">{t('emptyHint')}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
