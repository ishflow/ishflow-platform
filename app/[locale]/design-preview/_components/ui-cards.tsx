import { BarChart3, Package, TrendingUp, Wallet } from 'lucide-react';

const PANEL = 'flex h-full w-full flex-col bg-[oklch(0.12_0.01_255)]';
const HEAD =
  'flex items-center justify-between text-[8px] uppercase tracking-[0.14em] text-white/45';

export function KpiCard() {
  return (
    <div className={`${PANEL} justify-between p-3`}>
      <div className={HEAD}>
        <span>Выручка · июнь</span>
        <TrendingUp className="h-2.5 w-2.5 text-[#5BA0FF]" />
      </div>
      <div className="fd font-semibold text-[15px] text-white tabular-nums">2 482 000 ₽</div>
      <div className="text-[8px] text-emerald-400/90">+18% к маю</div>
      <svg viewBox="0 0 100 26" className="mt-1 w-full" aria-hidden="true">
        <defs>
          <linearGradient id="kpi-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4D8DFF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4D8DFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points="0,22 14,18 28,20 42,12 56,14 70,7 84,9 100,3 100,26 0,26"
          fill="url(#kpi-fill)"
        />
        <polyline
          points="0,22 14,18 28,20 42,12 56,14 70,7 84,9 100,3"
          fill="none"
          stroke="#4D8DFF"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function BarsCard() {
  const bars = [38, 52, 44, 66, 58, 84];
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн'];
  return (
    <div className={`${PANEL} p-3`}>
      <div className={HEAD}>
        <span>Продажи · 6 месяцев</span>
        <BarChart3 className="h-2.5 w-2.5 text-[#5BA0FF]" />
      </div>
      <div className="mt-2 flex flex-1 items-end gap-1.5">
        {bars.map((v, i) => (
          <div
            key={months[i]}
            className={`flex-1 rounded-[1px] ${i === bars.length - 1 ? 'bg-[#0F5EEF]' : 'bg-white/12'}`}
            style={{ height: `${v}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 text-[6px] text-white/30">
        {months.map((m) => (
          <span key={m} className="flex-1 text-center">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PhoneCard() {
  return (
    <div className={`${PANEL} gap-1 p-1.5`}>
      <div className="flex items-center justify-between px-0.5 text-[6px]">
        <span className="font-semibold text-white/80">ishflow</span>
        <span className="h-1 w-1 rounded-full bg-[#0F5EEF]" />
      </div>
      <div className="rounded-sm bg-white/[0.06] p-1">
        <div className="text-[5px] text-white/40 uppercase">Касса</div>
        <div className="text-[9px] text-white tabular-nums">412 380 ₽</div>
      </div>
      {[
        ['СФ-001207', '186 500'],
        ['ПКО-000318', '85 000'],
      ].map(([num, sum]) => (
        <div
          key={num}
          className="flex items-center justify-between rounded-sm bg-white/[0.03] px-1 py-0.5 text-[5px] text-white/60"
        >
          <span className="flex items-center gap-0.5">
            <span className="h-0.5 w-0.5 rounded-full bg-emerald-400" />
            {num}
          </span>
          <span className="tabular-nums">{sum}</span>
        </div>
      ))}
      <div className="mt-auto flex items-center justify-around pb-0.5">
        {['home', 'docs', 'reports', 'more'].map((tab) => (
          <span
            key={tab}
            className={`h-1 w-1 rounded-full ${tab === 'docs' ? 'bg-[#5BA0FF]' : 'bg-white/20'}`}
          />
        ))}
      </div>
    </div>
  );
}

export function DocCard() {
  const lines: [string, string][] = [
    ['Кофе зерно, 1 кг × 12', '22 200'],
    ['Сироп ваниль × 24', '14 880'],
    ['Стаканы 350 мл × 500', '12 500'],
  ];
  return (
    <div className={`${PANEL} p-3`}>
      <div className="fd font-semibold text-[9px] text-white">Счёт № СФ-001207</div>
      <div className="mt-0.5 text-[7px] text-white/40">от 10.06.2026 · ООО «Кофе и точка»</div>
      <div className="my-2 border-white/10 border-t" />
      <div className="space-y-1.5">
        {lines.map(([name, sum]) => (
          <div
            key={name}
            className="flex items-baseline justify-between gap-2 text-[7px] text-white/65"
          >
            <span className="truncate">{name}</span>
            <span className="tabular-nums">{sum}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-baseline justify-between border-white/10 border-t pt-2">
        <span className="font-semibold text-[8px] text-white">Итого</span>
        <span className="fd font-semibold text-[10px] text-white tabular-nums">186 500 ₽</span>
      </div>
      <div className="mt-2 inline-flex items-center gap-1 text-[7px] text-emerald-400">
        <span className="h-1 w-1 rounded-full bg-emerald-400" />
        ПРОВЕДЁН
      </div>
      <div className="mt-auto rounded-sm bg-[#0F5EEF] py-1 text-center font-medium text-[8px] text-white">
        Создать на основании
      </div>
    </div>
  );
}

export function StockCard() {
  const rows: [string, number, string][] = [
    ['Кофе зерно, 1 кг', 82, '124'],
    ['Сироп ваниль', 64, '96'],
    ['Стаканы 350 мл', 38, '1 750'],
    ['Молоко 3,2%', 91, '210'],
    ['Фильтры V60', 22, '48'],
  ];
  return (
    <div className={`${PANEL} p-3`}>
      <div className={HEAD}>
        <span>Остатки · Склад МСК</span>
        <Package className="h-2.5 w-2.5 text-[#5BA0FF]" />
      </div>
      <div className="mt-2.5 flex flex-1 flex-col justify-between">
        {rows.map(([name, pct, qty]) => (
          <div key={name}>
            <div className="flex items-baseline justify-between text-[7px] text-white/65">
              <span className="truncate">{name}</span>
              <span className="tabular-nums">{qty}</span>
            </div>
            <div className="mt-0.5 h-1 w-full rounded-full bg-white/10">
              <div className="h-1 rounded-full bg-[#0F5EEF]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CashCard() {
  const ops: [string, string, boolean][] = [
    ['Поступление', '+85 000', true],
    ['Выплата', '−32 400', false],
    ['Поступление', '+12 900', true],
  ];
  return (
    <div className={`${PANEL} p-3`}>
      <div className={HEAD}>
        <span>Касса</span>
        <Wallet className="h-2.5 w-2.5 text-[#5BA0FF]" />
      </div>
      <div className="fd mt-2 font-semibold text-[13px] text-white tabular-nums">412 380 ₽</div>
      <div className="mt-2.5 flex flex-1 flex-col justify-end gap-1.5">
        {ops.map(([name, sum, plus]) => (
          <div key={`${name}-${sum}`} className="flex items-baseline justify-between text-[7px]">
            <span className="text-white/55">{name}</span>
            <span className={`tabular-nums ${plus ? 'text-emerald-400/90' : 'text-red-400/80'}`}>
              {sum}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ArApCard() {
  return (
    <div className={`${PANEL} p-3`}>
      <div className={HEAD}>
        <span>Взаиморасчёты</span>
      </div>
      <div className="mt-2 grid flex-1 grid-cols-2 gap-3">
        <div className="flex flex-col justify-center">
          <div className="text-[7px] text-white/45 uppercase">Дебиторка</div>
          <div className="fd font-semibold text-[11px] text-white tabular-nums">1 240 500</div>
          <div className="mt-1 h-1 w-full rounded-full bg-white/10">
            <div className="h-1 w-[78%] rounded-full bg-[#4D8DFF]" />
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-[7px] text-white/45 uppercase">Кредиторка</div>
          <div className="fd font-semibold text-[11px] text-white tabular-nums">836 200</div>
          <div className="mt-1 h-1 w-full rounded-full bg-white/10">
            <div className="h-1 w-[52%] rounded-full bg-white/35" />
          </div>
        </div>
      </div>
      <div className="text-[6px] text-white/30">сходится копейка в копейку</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Module-section minis                                                */
/* ------------------------------------------------------------------ */

export function SalesMini() {
  const docs: [string, string, boolean][] = [
    ['СФ-001207', '186 500', true],
    ['СФ-001206', '92 300', true],
    ['СФ-001205', '47 800', false],
  ];
  return (
    <div className={`${PANEL} p-3`}>
      <div className={HEAD}>
        <span>Документы</span>
      </div>
      <div className="mt-2.5 space-y-1.5">
        {docs.map(([num, sum, posted]) => (
          <div key={num} className="rounded-sm bg-white/[0.04] px-2 py-1.5">
            <div className="flex items-baseline justify-between text-[7px] text-white/70">
              <span>{num}</span>
              <span className="tabular-nums">{sum}</span>
            </div>
            <div
              className={`mt-0.5 text-[6px] ${posted ? 'text-emerald-400/90' : 'text-white/35'}`}
            >
              {posted ? '● проведён' : '○ черновик'}
            </div>
          </div>
        ))}
      </div>
      <svg viewBox="0 0 100 20" className="mt-auto w-full" aria-hidden="true">
        <polyline
          points="0,16 20,12 40,14 60,7 80,9 100,3"
          fill="none"
          stroke="#4D8DFF"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  );
}

export function PurchasesMini() {
  const rows: [string, string][] = [
    ['ООО «Рассвет»', '218 400'],
    ['ИП Каримов', '96 750'],
    ['ООО «Вега-Т»', '54 320'],
  ];
  return (
    <div className={`${PANEL} p-3`}>
      <div className={HEAD}>
        <span>Поставщики</span>
      </div>
      <div className="mt-2.5 flex-1 space-y-2">
        {rows.map(([name, sum]) => (
          <div key={name} className="border-white/8 border-b pb-1.5">
            <div className="text-[7px] text-white/70">{name}</div>
            <div className="flex items-baseline justify-between">
              <span className="text-[6px] text-white/35">к оплате</span>
              <span className="text-[8px] text-white tabular-nums">{sum}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-sm bg-white/[0.06] px-2 py-1.5">
        <div className="text-[6px] text-white/40 uppercase">Итого кредиторка</div>
        <div className="fd text-[10px] text-white tabular-nums">369 470 ₽</div>
      </div>
    </div>
  );
}

export function StockMini() {
  const bars: [string, number][] = [
    ['a1', 62],
    ['a2', 84],
    ['b1', 38],
    ['b2', 71],
    ['c1', 49],
    ['c2', 90],
    ['d1', 57],
  ];
  return (
    <div className={`${PANEL} p-3`}>
      <div className={HEAD}>
        <span>Склад МСК</span>
      </div>
      <div className="mt-2 flex flex-1 items-end gap-1">
        {bars.map(([id, v]) => (
          <div
            key={id}
            className={`flex-1 rounded-[1px] ${id === 'c2' ? 'bg-[#0F5EEF]' : 'bg-white/12'}`}
            style={{ height: `${v}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-baseline justify-between text-[7px]">
        <span className="text-white/45">SKU в наличии</span>
        <span className="text-white tabular-nums">1 284</span>
      </div>
      <div className="flex items-baseline justify-between text-[7px]">
        <span className="text-white/45">резерв</span>
        <span className="text-white/70 tabular-nums">96</span>
      </div>
    </div>
  );
}

export function MoneyMini() {
  return (
    <div className={`${PANEL} p-3`}>
      <div className={HEAD}>
        <span>Деньги · ДДС</span>
      </div>
      <div className="fd mt-2 font-semibold text-[12px] text-white tabular-nums">+1 102 300 ₽</div>
      <div className="text-[6px] text-emerald-400/90">чистый поток · июнь</div>
      <svg viewBox="0 0 100 36" className="mt-auto w-full" aria-hidden="true">
        <defs>
          <linearGradient id="money-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4D8DFF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4D8DFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points="0,30 16,26 32,28 48,18 64,21 80,10 100,5 100,36 0,36"
          fill="url(#money-fill)"
        />
        <polyline
          points="0,30 16,26 32,28 48,18 64,21 80,10 100,5"
          fill="none"
          stroke="#4D8DFF"
          strokeWidth="1.3"
        />
      </svg>
    </div>
  );
}
