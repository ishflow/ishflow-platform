import type { ResolvedRowAction } from '@/platform/engine/resolve-row-actions';
import { Link } from '@/platform/i18n/navigation';
import { HandCoins, MoreHorizontal } from 'lucide-react';
import type { ComponentType } from 'react';

const ROW_ACTION_ICONS: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  HandCoins,
};

export type InvoiceRowProps = {
  id: string;
  docNo: string;
  date: string;
  partnerName: string;
  warehouse?: string;
  priceType?: string;
  amount: string;
  status: { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' };
  detailHref: string;
  rowActions?: ResolvedRowAction[];
};

export function V2InvoiceRow(props: InvoiceRowProps) {
  return (
    <tr data-status={props.status.tone}>
      <td>
        <span className="checkbox" />
      </td>
      <td className="mono">
        <Link href={props.detailHref} style={{ color: 'inherit' }}>
          {props.docNo}
        </Link>
      </td>
      <td>
        <span className={`pill pill-${props.status.tone}`}>{props.status.label}</span>
      </td>
      <td>{props.date}</td>
      <td>{props.partnerName}</td>
      <td>{props.warehouse ?? '—'}</td>
      <td>{props.priceType ?? '—'}</td>
      <td className="num">{props.amount}</td>
      <td>
        <div className="row-actions">
          {(props.rowActions ?? []).map((action) => {
            const Icon = action.icon ? (ROW_ACTION_ICONS[action.icon] ?? HandCoins) : HandCoins;
            return (
              <Link
                key={action.key}
                href={action.href}
                className="row-pay-action"
                title={action.label}
              >
                <Icon size={13} strokeWidth={2} />
                <span>{action.label}</span>
              </Link>
            );
          })}
          <button className="row-menu" type="button" aria-label="More">
            <MoreHorizontal size={14} strokeWidth={1.75} />
          </button>
        </div>
      </td>
    </tr>
  );
}
