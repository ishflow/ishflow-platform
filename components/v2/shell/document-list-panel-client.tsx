'use client';

import { Link, usePathname } from '@/platform/i18n/navigation';
import {
  ArrowLeftRight,
  ChevronLeft,
  Circle,
  ClipboardCheck,
  MinusCircle,
  Search,
  Undo2,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { type BackKey, type DocMode, MODE_CONFIG, detectDocMode } from './document-modes';

type Row = { id: string; code: string; name: string };

export type { DocMode } from './document-modes';

export type DocumentListPanelData = {
  salesInvoice: Row[];
  purchaseInvoice: Row[];
  paymentReceived: Row[];
  paymentSent: Row[];
  warehouses: Row[];
  returnInvoice: Row[];
  returnPurchase: Row[];
  stockTransfer: Row[];
  inventoryCount: Row[];
  stockAdjustment: Row[];
  stockMovementCounts: {
    inventoryCount: number;
    stockTransfer: number;
    stockAdjustment: number;
    returnInvoice: number;
  };
  i18n: {
    backToDocuments: string;
    backToCatalogs: string;
    backToList: Record<
      'returnInvoice' | 'returnPurchase' | 'stockTransfer' | 'inventoryCount' | 'stockAdjustment',
      string
    >;
    searchPlaceholder: string;
    draft: string;
    titles: Record<DocMode, string>;
    stockMovements: {
      title: string;
      inventoryCount: string;
      stockTransfer: string;
      stockAdjustment: string;
      returnInvoice: string;
    };
  };
};

const STOCK_MOVEMENT_ORDER: Array<{
  mode: 'inventoryCount' | 'stockTransfer' | 'stockAdjustment' | 'returnInvoice';
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}> = [
  { mode: 'inventoryCount', icon: ClipboardCheck },
  { mode: 'stockTransfer', icon: ArrowLeftRight },
  { mode: 'stockAdjustment', icon: MinusCircle },
  { mode: 'returnInvoice', icon: Undo2 },
];

function activeIdFromPath(pathname: string): string | null {
  const seg = pathname.split('/').filter(Boolean);
  const last = seg[seg.length - 1];
  if (!last || !/^[0-9a-f-]{36}$/.test(last)) return null;
  return last;
}

function resolveBackLabel(i18n: DocumentListPanelData['i18n'], key: BackKey): string {
  switch (key) {
    case 'backToDocuments':
      return i18n.backToDocuments;
    case 'backToCatalogs':
      return i18n.backToCatalogs;
    case 'backToList.returnInvoice':
      return i18n.backToList.returnInvoice;
    case 'backToList.returnPurchase':
      return i18n.backToList.returnPurchase;
    case 'backToList.stockTransfer':
      return i18n.backToList.stockTransfer;
    case 'backToList.inventoryCount':
      return i18n.backToList.inventoryCount;
    case 'backToList.stockAdjustment':
      return i18n.backToList.stockAdjustment;
  }
}

export function V2DocumentListPanelClient({ data }: { data: DocumentListPanelData }) {
  const pathname = usePathname();
  const mode = detectDocMode(pathname);

  if (!mode) {
    // Defensive — switcher only mounts this panel on doc record routes, but
    // if it ever leaks elsewhere render the chrome and bail.
    return (
      <aside className="panel">
        <div className="panel-search">
          <Search size={14} strokeWidth={1.75} className="search-icon" />
          <input
            type="text"
            placeholder={data.i18n.searchPlaceholder}
            aria-label={data.i18n.searchPlaceholder}
          />
        </div>
      </aside>
    );
  }

  const cfg = MODE_CONFIG[mode];
  const activeId = activeIdFromPath(pathname);
  const isNewForMode = pathname.endsWith('/new');
  const rows = data[mode];
  const title = data.i18n.titles[mode];
  const draftHref = `${cfg.routePrefix}/new`;
  const RowIcon = cfg.rowIcon;

  return (
    <aside className="panel">
      <Link href={cfg.backHref} className="panel-back">
        <ChevronLeft size={14} strokeWidth={1.75} />
        {resolveBackLabel(data.i18n, cfg.backLabelKey)}
      </Link>
      <div className="panel-divider" />

      <div className="panel-search">
        <Search size={14} strokeWidth={1.75} className="search-icon" />
        <input
          type="text"
          placeholder={data.i18n.searchPlaceholder}
          aria-label={data.i18n.searchPlaceholder}
        />
      </div>

      {cfg.layout === 'dual' ? (
        <>
          <div className="panel-title">{data.i18n.stockMovements.title}</div>
          <div className="panel-list">
            {STOCK_MOVEMENT_ORDER.map(({ mode: m, icon: Icon }) => {
              const navCfg = MODE_CONFIG[m];
              const count = data.stockMovementCounts[m];
              const isActiveNav = m === mode;
              return (
                <Link
                  key={m}
                  href={navCfg.routePrefix}
                  className={`panel-item${isActiveNav ? ' is-active' : ''}`}
                >
                  <Icon size={14} strokeWidth={1.75} />
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {data.i18n.stockMovements[m]}
                  </span>
                  <span className="count">{count}</span>
                </Link>
              );
            })}
          </div>
        </>
      ) : null}

      <div className="panel-title" style={cfg.layout === 'dual' ? { marginTop: 18 } : undefined}>
        {title}
      </div>
      <div className="panel-list">
        {isNewForMode && (
          <Link href={draftHref} className="panel-item is-active">
            <Circle size={14} strokeWidth={1.75} />
            {data.i18n.draft}
          </Link>
        )}
        {rows.map((r) => {
          const isActive = activeId === r.id;
          return (
            <Link
              key={r.id}
              href={`${cfg.routePrefix}/${r.id}`}
              className={`panel-item${isActive ? ' is-active' : ''}`}
            >
              <RowIcon size={14} strokeWidth={1.75} />
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.code || r.name}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
