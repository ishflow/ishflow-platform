#!/usr/bin/env node
/* eslint-disable no-console */

const BASE = process.env.UAT_BASE ?? 'http://localhost:3100';
const LOCALE = process.env.UAT_LOCALE ?? 'en';

const checks = [
  { name: 'admin fx-rates page renders', url: `/${LOCALE}/v2/admin/fx-rates`, contains: 'FX' },
  {
    name: 'period-close fx page renders',
    url: `/${LOCALE}/v2/admin/period-close/fx`,
    contains: 'evaluation',
  }, // "Revaluation"
  {
    name: 'onboarding currency step renders',
    url: `/${LOCALE}/v2/onboarding/currency`,
    contains: 'currency',
  },
  {
    name: 'sales invoice new page renders',
    url: `/${LOCALE}/v2/documents/sales-invoice/new`,
    contains: 'invoice',
  },
  {
    name: 'purchase invoice new page renders',
    url: `/${LOCALE}/v2/documents/purchase-invoice/new`,
    contains: 'invoice',
  },
  {
    name: 'payment received new page renders',
    url: `/${LOCALE}/v2/documents/payment-received/new`,
    contains: 'payment',
  },
  {
    name: 'payment sent new page renders',
    url: `/${LOCALE}/v2/documents/payment-sent/new`,
    contains: 'payment',
  },
  {
    name: 'cash registers list renders',
    url: `/${LOCALE}/v2/catalogs/cash-registers`,
    contains: 'ash',
  }, // "Cash" or "Касс"
  { name: 'currencies catalog renders', url: `/${LOCALE}/v2/admin/currencies`, contains: 'urrenc' },
  { name: 'dashboard renders', url: `/${LOCALE}/v2/dashboard`, contains: '' },
  {
    name: 'cron route returns 401 without secret',
    url: `/api/cron/fx-rates`,
    expectStatus: 401,
    contains: '',
  },
  { name: 'fx rate api requires currency', url: `/api/fx/rate`, expectStatus: 400, contains: '' },
];

let pass = 0;
let fail = 0;
const failures = [];

for (const c of checks) {
  process.stdout.write(`  ${c.name.padEnd(48, '.')} `);
  try {
    const res = await fetch(`${BASE}${c.url}`, { redirect: 'manual' });
    const expectedStatus = c.expectStatus ?? 200;
    let okStatus = res.status === expectedStatus;
    // Accept 307 (Next locale redirect or auth redirect) for any default-200 check
    if (!okStatus && expectedStatus === 200 && res.status === 307) okStatus = true;
    let okContent = true;
    if (c.contains && expectedStatus === 200 && res.status === 200) {
      const body = await res.text();
      okContent = body.toLowerCase().includes(c.contains.toLowerCase());
    }
    if (okStatus && okContent) {
      console.log(`OK (${res.status})`);
      pass++;
    } else {
      console.log(`FAIL (status=${res.status}${!okContent ? `, no '${c.contains}'` : ''})`);
      failures.push(c.name);
      fail++;
    }
  } catch (e) {
    console.log(`ERR ${e instanceof Error ? e.message : String(e)}`);
    failures.push(c.name);
    fail++;
  }
}

console.log(`\n${pass}/${pass + fail} passed`);
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const name of failures) console.log(`  - ${name}`);
}
process.exit(fail === 0 ? 0 : 1);
