import { cn } from '@/lib/utils';

type PanelKind = 'catalog' | 'document' | 'report';

const CATALOG_ROWS: Array<[string, string]> = [
  ['Контрагенты', '248'],
  ['Номенклатура', '1 482'],
  ['Счета', '36'],
  ['Склады', '4'],
];

const DOCUMENT_ROWS: Array<[string, string, string]> = [
  ['№ 2847', 'Реализация', '240 000 ₽'],
  ['№ 504', 'Поступление', '82 750 ₽'],
  ['№ 1820', 'Платёж', '1 120 000 ₽'],
  ['№ 2846', 'Реализация', '48 500 ₽'],
];

const REPORT_ROWS: Array<[string, string, 'up' | 'down']> = [
  ['Выручка', '14,2 млн ₽', 'up'],
  ['Прибыль', '3,8 млн ₽', 'up'],
  ['Дебиторка', '2,1 млн ₽', 'down'],
];

interface Props {
  labels: [string, string, string];
}

export function ShowcasePanelStack({ labels }: Props) {
  return (
    <div className="relative isolate aspect-[16/12] sm:aspect-[16/11]">
      {/* Soft accent glow behind the stack */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            'radial-gradient(55% 60% at 60% 50%, var(--marketing-accent-soft), transparent 70%)',
          filter: 'blur(10px)',
        }}
      />

      <Panel
        kind="report"
        label={labels[2]}
        className="absolute right-0 top-0 w-[78%] rotate-[3deg]"
        zIndex={10}
      >
        <ReportRows />
      </Panel>

      <Panel
        kind="document"
        label={labels[1]}
        className="absolute left-[8%] top-[26%] w-[80%] -rotate-[2deg]"
        zIndex={20}
      >
        <DocumentRows />
      </Panel>

      <Panel
        kind="catalog"
        label={labels[0]}
        className="absolute bottom-0 left-0 w-[78%] rotate-[2deg]"
        zIndex={30}
      >
        <CatalogRows />
      </Panel>
    </div>
  );
}

function Panel({
  kind: _kind,
  label,
  children,
  className,
  zIndex,
}: {
  kind: PanelKind;
  label: string;
  children: React.ReactNode;
  className?: string;
  zIndex: number;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-elev-lg backdrop-blur-sm',
        'transition-transform duration-500 ease-out hover:scale-[1.015]',
        className,
      )}
      style={{ zIndex }}
    >
      <div className="flex items-center gap-2 border-b border-border bg-marketing-bg-2/70 px-3 py-2">
        <div className="flex gap-1.5">
          <span className="size-2 rounded-full bg-red-500/80" />
          <span className="size-2 rounded-full bg-amber-500/80" />
          <span className="size-2 rounded-full bg-emerald-500/80" />
        </div>
        <div className="ml-1 text-[10px] font-medium uppercase tracking-[0.12em] text-marketing-fg-3">
          {label}
        </div>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function CatalogRows() {
  return (
    <ul className="divide-y divide-border/70 text-[11px]">
      {CATALOG_ROWS.map(([name, count]) => (
        <li key={name} className="flex items-center justify-between py-1.5">
          <span className="text-marketing-fg-2">{name}</span>
          <span className="font-mono text-marketing-fg-3">{count}</span>
        </li>
      ))}
    </ul>
  );
}

function DocumentRows() {
  return (
    <ul className="divide-y divide-border/70 text-[11px]">
      {DOCUMENT_ROWS.map(([num, kind, sum]) => (
        <li key={num} className="grid grid-cols-[60px_1fr_auto] items-center gap-2 py-1.5">
          <span className="font-mono text-marketing-fg-3">{num}</span>
          <span className="truncate text-marketing-fg-2">{kind}</span>
          <span className="font-mono text-foreground">{sum}</span>
        </li>
      ))}
    </ul>
  );
}

function ReportRows() {
  return (
    <ul className="divide-y divide-border/70 text-[11px]">
      {REPORT_ROWS.map(([name, value, trend]) => (
        <li key={name} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 py-1.5">
          <span className="text-marketing-fg-2">{name}</span>
          <span className="font-mono text-foreground">{value}</span>
          <TrendChip trend={trend} />
        </li>
      ))}
    </ul>
  );
}

function TrendChip({ trend }: { trend: 'up' | 'down' }) {
  const isUp = trend === 'up';
  return (
    <span
      className={cn(
        'inline-flex size-4 items-center justify-center rounded-full text-[9px] font-medium',
        isUp
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
      )}
    >
      {isUp ? '▲' : '▼'}
    </span>
  );
}
