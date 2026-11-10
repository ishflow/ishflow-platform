'use client';

import { Link } from '@/platform/i18n/navigation';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type PrintToolbarProps = {
  backHref: string;
};

export function V2PrintToolbar({ backHref }: PrintToolbarProps) {
  const t = useTranslations('v2_documents_extra.print.toolbar');

  return (
    <div className="v2-print-toolbar">
      <div className="left">
        <Link href={backHref} className="btn btn-ghost btn-sm">
          <ArrowLeft size={14} strokeWidth={1.75} />
          {t('back')}
        </Link>
        <span className="dim" style={{ fontSize: 12 }}>
          {t('a4Hint')}
        </span>
      </div>
      <div className="right">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
          <Printer size={14} strokeWidth={1.75} />
          {t('print')}
        </button>
        <button type="button" className="btn btn-primary btn-sm">
          <Download size={14} strokeWidth={1.75} />
          {t('pdf')}
        </button>
      </div>
    </div>
  );
}
