'use client';

import { Link } from '@/platform/i18n/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

export type SpecialPriceRow = {
  id: string;
  customer: { name: string; code: string };
  product: { name: string; sku: string };
  unitPrice: string;
  discount: string | null;
  validity: string;
  expired: boolean;
};

export function SpecialPriceList({ rows }: { rows: SpecialPriceRow[] }) {
  const t = useTranslations('v2_catalogs.specialPrices.list');
  const total = rows.length;
  const activeCount = rows.filter((r) => !r.expired).length;
  const expiredCount = total - activeCount;
  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div className="left">
          <div className="chip-row">
            <button type="button" className="chip is-active">
              {t('chip.all')} <span className="count">{total}</span>
            </button>
            <button type="button" className="chip">
              {t('chip.active')} <span className="count">{activeCount}</span>
            </button>
            <button type="button" className="chip">
              {t('chip.expired')} <span className="count">{expiredCount}</span>
            </button>
          </div>
        </div>
        <div className="right">
          <div className="search-input">
            <Search size={14} strokeWidth={1.75} />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
            />
          </div>
          <button type="button" className="btn btn-secondary btn-sm">
            <Filter size={14} strokeWidth={1.75} />
            {t('filter')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm">
            <Download size={14} strokeWidth={1.75} />
            {t('export')}
          </button>
          <Link href="/catalogs/price-types/special/new" className="btn btn-primary btn-sm">
            <Plus size={14} strokeWidth={1.75} />
            {t('new')}
          </Link>
        </div>
      </div>

      <table className="data">
        <thead>
          <tr>
            <th style={{ width: 36 }}>
              <span className="checkbox" />
            </th>
            <th>{t('cols.customer')}</th>
            <th>{t('cols.product')}</th>
            <th className="num sortable">{t('cols.unitPrice')}</th>
            <th className="num">{t('cols.discount')}</th>
            <th>{t('cols.validity')}</th>
            <th>{t('cols.status')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}
              >
                {t('empty')}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className="checkbox" />
                </td>
                <td>
                  <Link href={`/catalogs/price-types/special/${r.id}`} className="row-title">
                    {r.customer.name}
                  </Link>
                  <div className="row-sub">{r.customer.code}</div>
                </td>
                <td>
                  <div className="row-title">{r.product.name}</div>
                  <div className="row-sub">{r.product.sku}</div>
                </td>
                <td className="num">{r.unitPrice}</td>
                <td className="num">
                  {r.discount ? (
                    <span className="pill pill-info">{r.discount}</span>
                  ) : (
                    <span className="dim">—</span>
                  )}
                </td>
                <td>{r.validity}</td>
                <td>
                  <span className={`pill pill-${r.expired ? 'neutral' : 'success'}`}>
                    {r.expired ? t('status.expired') : t('status.active')}
                  </span>
                </td>
                <td>
                  <button type="button" className="row-menu" aria-label={t('actionsLabel')}>
                    <MoreHorizontal size={14} strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="table-footer">
        <div>
          {t('pagination', {
            from: total === 0 ? 0 : 1,
            to: total,
            total,
            pageSize: 25,
          })}
        </div>
        <div className="pager">
          <span className="pg">
            <ChevronLeft size={12} strokeWidth={1.75} />
          </span>
          <span className="pg is-active">1</span>
          <span className="pg">
            <ChevronRight size={12} strokeWidth={1.75} />
          </span>
        </div>
      </div>
    </section>
  );
}
