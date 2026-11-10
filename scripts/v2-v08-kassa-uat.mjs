#!/usr/bin/env node
// scripts/v2-v08-kassa-uat.mjs
//
// Kassa Phase 2 smoke / UAT runner.
//
// Hits every route shipped in Phase 2 and asserts:
//   1. HTTP 200
//   2. Page HTML contains route-specific anchor strings (KPI label,
//      column header, hub card title) — guards against the page
//      rendering an empty shell or "not found" placeholder.
//
// Intentionally does NOT do form submissions / auth flows — those
// require a live Clerk dev session and are best done manually by the
// user. The 200 + content-anchor pattern catches the failure modes
// most likely to show up in CI (missing config registration, broken
// engine renderer, i18n key collision, route shell typo).
//
// Run:  pnpm dev   # in another terminal
//       node scripts/v2-v08-kassa-uat.mjs
//
// Optional env:
//   UAT_BASE_URL   default http://localhost:3100
//   UAT_LOCALE     default tr

const BASE = process.env.UAT_BASE_URL ?? 'http://localhost:3100';
const LOCALE = process.env.UAT_LOCALE ?? 'tr';

/** @type {Array<{ name: string; path: string; expectAny: string[] }>} */
const checks = [
  {
    name: 'Registers hub includes Kasa Hareketleri card',
    path: '/v2/registers',
    expectAny: ['Kasa Hareketleri', 'Денежные средства', 'Cash Funds'],
  },
  {
    name: 'cash_funds register view renders',
    path: '/v2/registers/cash_funds',
    expectAny: ['Kasa Hareketleri', 'Денежные средства', 'Cash Funds'],
  },
  {
    name: 'cash_funds chip=income renders',
    path: '/v2/registers/cash_funds?chip=income',
    expectAny: ['Gelir', 'Поступления', 'Income'],
  },
  {
    name: 'cash_funds chip=expense renders',
    path: '/v2/registers/cash_funds?chip=expense',
    expectAny: ['Gider', 'Расходы', 'Expense'],
  },
  {
    name: 'AR register movements chip renders',
    path: '/v2/registers/accounts_receivable?chip=movements',
    expectAny: ['Hareketler', 'Все движения', 'Movements'],
  },
  {
    name: 'AP register movements chip renders',
    path: '/v2/registers/accounts_payable?chip=movements',
    expectAny: ['Hareketler', 'Все движения', 'Movements'],
  },
  {
    name: 'Cash book report renders',
    path: '/v2/reports/cash-book',
    expectAny: ['Kasa Defteri', 'Кассовая книга', 'Cash Book'],
  },
  {
    name: 'Cash book Treasury section grouping visible',
    path: '/v2/reports/cash-book',
    expectAny: ['Treasury', 'Касса', 'Kasa'],
  },
  {
    name: 'Dashboard renders without 500',
    path: '/v2/dashboard',
    // Dashboard contains the cash KPI tile; the label must be present.
    expectAny: ['Kasa', 'Касса', 'Cash'],
  },
];

let pass = 0;
const failed = [];

for (const c of checks) {
  const url = `${BASE}/${LOCALE}${c.path}`;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (res.status !== 200) {
      failed.push({ name: c.name, url, reason: `status ${res.status}` });
      continue;
    }
    const body = await res.text();
    const hit = c.expectAny.find((needle) => body.includes(needle));
    if (!hit) {
      failed.push({
        name: c.name,
        url,
        reason: `none of [${c.expectAny.join(', ')}] found in body`,
      });
      continue;
    }
    pass += 1;
    console.log(`  ✓ ${c.name}  (matched "${hit}")`);
  } catch (e) {
    failed.push({ name: c.name, url, reason: e?.message ?? String(e) });
  }
}

const total = pass + failed.length;
console.log(`\n${pass}/${total} passed`);
if (failed.length > 0) {
  for (const f of failed) {
    console.error(`  ✗ ${f.name}\n    ${f.url}\n    ${f.reason}`);
  }
  process.exit(1);
}
