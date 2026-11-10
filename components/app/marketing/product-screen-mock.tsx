import { cn } from '@/lib/utils';
import { MarketingIcon } from './icons/marketing-icons';

interface Props {
  compact?: boolean;
}

type Status = 'paid' | 'pending' | 'draft';

const DOCS: Array<[string, string, string, string, Status]> = [
  ['№ 2847', '12.05.2026', 'ООО «Полюс»', '240 000,00 ₽', 'paid'],
  ['№ 2846', '12.05.2026', 'ИП Касымов А.Б.', '48 500,00 ₽', 'paid'],
  ['№ 2845', '11.05.2026', 'ТОО «Алмаз-Строй»', '1 120 000,00 ₽', 'pending'],
  ['№ 2844', '11.05.2026', 'ООО «Невские Окна»', '82 750,00 ₽', 'paid'],
  ['№ 2843', '10.05.2026', 'ИП Рахимова Д.', '16 200,00 ₽', 'draft'],
  ['№ 2842', '10.05.2026', 'ООО «ТехноСервис»', '365 000,00 ₽', 'paid'],
];

const STATUS_LABEL: Record<Status, string> = {
  paid: 'Оплачен',
  pending: 'Ожидает',
  draft: 'Черновик',
};

function StatusChip({ status, label }: { status: Status; label: string }) {
  const tone =
    status === 'paid'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : status === 'pending'
        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        : 'bg-muted text-muted-foreground';
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', tone)}>{label}</span>
  );
}

export function ProductScreenMock({ compact = false }: Props) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card shadow-elev-lg overflow-hidden',
        compact && 'scale-95',
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-marketing-bg-2">
        <div className="flex gap-1.5">
          {['bg-red-500', 'bg-amber-500', 'bg-emerald-500'].map((c) => (
            <span key={c} className={cn('size-2.5 rounded-full', c)} />
          ))}
        </div>
        <div className="ml-3 flex-1 text-xs font-mono text-marketing-fg-3">
          app.ishflow.com/documents/sales
        </div>
      </div>
      <div className={cn('grid', compact ? 'grid-cols-1' : 'grid-cols-[200px_1fr]')}>
        {!compact && (
          <aside className="border-r border-border bg-marketing-bg-2/40 p-3 text-xs">
            <div className="text-[10px] uppercase tracking-wider text-marketing-fg-3 mb-2">
              Каталоги
            </div>
            <SidebarItem icon="users" label="Контрагенты" />
            <SidebarItem icon="box" label="Номенклатура" />
            <SidebarItem icon="catalog" label="Счета" />
            <div className="mt-4 text-[10px] uppercase tracking-wider text-marketing-fg-3 mb-2">
              Документы
            </div>
            <SidebarItem icon="doc" label="Реализации" badge="128" active />
            <SidebarItem icon="receipt" label="Поступления" />
            <SidebarItem icon="cash" label="Платежи" />
            <div className="mt-4 text-[10px] uppercase tracking-wider text-marketing-fg-3 mb-2">
              Отчёты
            </div>
            <SidebarItem icon="chart" label="ОСВ" />
            <SidebarItem icon="report" label="Книга продаж" />
          </aside>
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display text-lg font-medium">Реализации товаров</div>
              <div className="text-xs text-marketing-fg-3 mt-1">
                Май 2026 · 128 документов · 14,2 млн ₽
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium"
            >
              <MarketingIcon name="plus" size={12} /> Создать
            </button>
          </div>
          <div className="mt-4 flex gap-2 text-xs">
            {['Все', 'Оплачен', 'Ожидает', 'Черновик'].map((p, i) => (
              <span
                key={p}
                className={cn(
                  'rounded-full border px-2.5 py-1',
                  i === 0
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-marketing-fg-2',
                )}
              >
                {p}
              </span>
            ))}
          </div>
          <table className="mt-4 w-full text-xs">
            <thead className="text-marketing-fg-3 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left py-2">Номер</th>
                <th className="text-left">Дата</th>
                <th className="text-left">Контрагент</th>
                <th className="text-right">Сумма</th>
                <th className="text-left pl-3">Статус</th>
              </tr>
            </thead>
            <tbody>
              {DOCS.map((r) => (
                <tr key={r[0]} className="border-t border-border">
                  <td className="py-2">{r[0]}</td>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                  <td className="text-right font-mono">{r[3]}</td>
                  <td className="pl-3">
                    <StatusChip status={r[4]} label={STATUS_LABEL[r[4]]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  badge,
  active,
}: {
  icon: 'users' | 'box' | 'catalog' | 'doc' | 'receipt' | 'cash' | 'chart' | 'report';
  label: string;
  badge?: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-marketing-fg-2',
        active && 'bg-card text-foreground',
      )}
    >
      <div className="flex items-center gap-2">
        <MarketingIcon name={icon} size={13} />
        {label}
      </div>
      {badge && <span className="text-[10px] text-marketing-fg-3">{badge}</span>}
    </div>
  );
}
