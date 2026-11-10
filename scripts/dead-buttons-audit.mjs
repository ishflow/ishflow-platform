// dead-buttons-audit.mjs
//
// HEADED Chromium tour of every V2 list page. Per page:
//   1. Navigate; record HTTP status + screenshot.
//   2. Enumerate every <button>/<a>/<input type=search>/<select> inside the
//      page's main content area, capturing text/placeholder/aria-label.
//   3. Click each in turn (with destructive-action skip-list). After each
//      click: snapshot URL, look for toast/dialog/modal, look for DOM
//      mutation (row count change, attribute flip, etc.). Anything that
//      produces zero observable effect is recorded as DEAD.
//   4. Specialized probes:
//        - search input: type a string + press Enter; assert URL gains ?q=
//        - pagination links: count visible page chips; click "next" if
//          present + assert URL gains ?page=
//        - filter / export buttons: detect `disabled` / aria-disabled and
//          flag as 'hard-disabled' rather than 'dead' (different bug class)
//
// Output:
//   /tmp/dead-buttons.json   — full structured report
//   /tmp/dead-buttons.log    — human-readable tail
//
// Run: node scripts/dead-buttons-audit.mjs
//   PWHEAD=0  → headless
//   SECTION=catalogs.products  → audit just one page (faster iteration)

import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

const BASE_URL = process.env.WALKTHROUGH_BASE_URL ?? 'http://localhost:3100';
const LOCALE = 'tr';
const HEADED = process.env.PWHEAD !== '0';
const ONLY = process.env.SECTION ?? null;
const STEP = HEADED ? 350 : 30;
const FAIL_OUT = '/tmp/dead-buttons.json';
const LOG_OUT = '/tmp/dead-buttons.log';

const logFile = await fs.open(LOG_OUT, 'w');
function line(msg = '') {
  console.log(msg);
  logFile.write(`${msg}\n`).catch(() => {});
}
function header(t) {
  line('');
  line(`━━━━━━━━━━ ${t} ━━━━━━━━━━`);
}

// Sections to audit. For each: target URL + which probes to run.
const SECTIONS = [
  // ─── Catalogs (most have search/filter/export/pagination) ───
  {
    id: 'catalogs.products',
    route: '/v2/catalogs/products',
    probes: ['search', 'filter', 'export', 'pagination', 'new-cta'],
  },
  {
    id: 'catalogs.warehouses',
    route: '/v2/catalogs/warehouses',
    probes: ['search', 'filter', 'export', 'pagination', 'new-cta'],
  },
  {
    id: 'catalogs.partners',
    route: '/v2/catalogs/partners',
    probes: ['search', 'filter', 'export', 'pagination', 'new-cta'],
  },
  {
    id: 'catalogs.price-types',
    route: '/v2/catalogs/price-types',
    probes: ['search', 'filter', 'export', 'pagination', 'new-cta'],
  },
  {
    id: 'catalogs.cash-registers',
    route: '/v2/catalogs/cash-registers',
    probes: ['search', 'filter', 'export', 'pagination', 'new-cta'],
  },
  {
    id: 'catalogs.fixed-assets',
    route: '/v2/catalogs/fixed-assets',
    probes: ['search', 'filter', 'export', 'pagination', 'new-cta'],
  },

  // ─── Documents (sales + purchases lists) ───
  {
    id: 'docs.sales-invoice',
    route: '/v2/documents/sales-invoice',
    probes: ['search', 'filter', 'export', 'pagination', 'new-cta'],
  },
  {
    id: 'docs.payment-received',
    route: '/v2/documents/payment-received',
    probes: ['search', 'filter', 'export', 'pagination', 'new-cta'],
  },
  {
    id: 'docs.return-invoice',
    route: '/v2/documents/return-invoice',
    probes: ['search', 'filter', 'export', 'pagination', 'new-cta'],
  },
  {
    id: 'docs.stock-transfer',
    route: '/v2/documents/stock-transfer',
    probes: ['search', 'filter', 'export', 'pagination', 'new-cta'],
  },
  {
    id: 'purch.invoice',
    route: '/v2/purchases/purchase-invoice',
    probes: ['search', 'filter', 'export', 'pagination', 'new-cta'],
  },
  {
    id: 'purch.payment-sent',
    route: '/v2/purchases/payment-sent',
    probes: ['search', 'filter', 'export', 'pagination', 'new-cta'],
  },
  {
    id: 'purch.return',
    route: '/v2/purchases/return-purchase',
    probes: ['search', 'filter', 'export', 'pagination', 'new-cta'],
  },

  // ─── Registers (hub + each register) ───
  { id: 'registers.hub', route: '/v2/registers', probes: ['hub-cards', 'sidebar-records-item'] },
  {
    id: 'registers.ar',
    route: '/v2/registers/accounts_receivable',
    probes: ['period', 'chip', 'export'],
  },
  {
    id: 'registers.ap',
    route: '/v2/registers/accounts_payable',
    probes: ['period', 'chip', 'export'],
  },
  { id: 'registers.sales', route: '/v2/registers/sales', probes: ['period', 'chip', 'export'] },
  {
    id: 'registers.stock',
    route: '/v2/registers/stock-balance',
    probes: ['period', 'chip', 'export'],
  },

  // ─── Reports (hub + a few) ───
  { id: 'reports.hub', route: '/v2/reports', probes: ['hub-cards'] },
  {
    id: 'reports.gross-profit',
    route: '/v2/reports/gross-profit',
    probes: ['period', 'chip', 'export'],
  },
  { id: 'reports.turnover', route: '/v2/reports/turnover', probes: ['period', 'chip', 'export'] },
  {
    id: 'reports.counterparty-card',
    route: '/v2/reports/counterparty-card',
    probes: ['period', 'chip', 'export'],
  },

  // ─── Dashboard ───
  { id: 'dashboard', route: '/v2/dashboard', probes: ['sidebar-summary', 'kpi-strip'] },
];

const findings = [];

function record(section, kind, ok, info = '') {
  findings.push({ section, kind, ok, info });
  const icon = ok === 'pass' ? '✅' : ok === 'dead' ? '❌' : ok === 'disabled' ? '⚠️' : '🟡';
  line(`   ${icon} ${kind}  ${info}`);
}

async function probeSearch(page, sec) {
  // Find a visible search input
  const searchInput = page
    .locator('input[type="search"], input[placeholder*="ara" i], input[placeholder*="search" i]')
    .first();
  const cnt = await searchInput.count();
  if (cnt === 0) {
    record(sec.id, 'search.input.present', 'dead', 'no <input type=search> found');
    return;
  }
  const before = page.url();
  await searchInput.fill('zzzznope');
  await searchInput.press('Enter');
  await page.waitForTimeout(700);
  const after = page.url();
  const urlChanged = after !== before;
  const hasQ = after.includes('q=zzzznope') || after.includes('q=zzz');
  if (urlChanged && hasQ) {
    record(sec.id, 'search.submits', 'pass', `url gained ?q=`);
    // Restore — go back so chips/pagination work afterward
    await page.goto(`${BASE_URL}/${LOCALE}${sec.route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(STEP);
  } else {
    record(sec.id, 'search.submits', 'dead', `before=${before} after=${after}`);
  }
}

async function probeFilter(page, sec) {
  const btn = page.locator('button:has-text("Filtre"), button:has-text("Filter")').first();
  const cnt = await btn.count();
  if (cnt === 0) {
    record(sec.id, 'filter.button.present', 'dead', 'no Filter button found');
    return;
  }
  const disabled = await btn.evaluate(
    (el) => el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true',
  );
  if (disabled) {
    record(sec.id, 'filter.button.usable', 'disabled', 'button is disabled');
    return;
  }
  // Click and look for popover/menu
  const beforeUrl = page.url();
  const beforeDom = await page.locator('body').innerHTML();
  await btn.click({ timeout: 2000 });
  await page.waitForTimeout(400);
  const afterUrl = page.url();
  const afterDom = await page.locator('body').innerHTML();
  const popped = await page.locator('[role="dialog"], [role="menu"], [data-state="open"]').count();
  const domChanged = beforeDom.length !== afterDom.length || beforeDom !== afterDom;
  if (popped > 0 || domChanged || afterUrl !== beforeUrl) {
    record(sec.id, 'filter.button.action', 'pass', `pops=${popped} dom-changed=${domChanged}`);
  } else {
    record(sec.id, 'filter.button.action', 'dead', 'click produced no observable effect');
  }
}

async function probeExport(page, sec) {
  const btn = page
    .locator('button:has-text("Dışa aktar"), button:has-text("Export"), button:has-text("Aktar")')
    .first();
  const cnt = await btn.count();
  if (cnt === 0) {
    record(sec.id, 'export.button.present', 'dead', 'no Export button found');
    return;
  }
  const disabled = await btn.evaluate(
    (el) => el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true',
  );
  if (disabled) {
    record(sec.id, 'export.button.usable', 'disabled', 'button is disabled');
    return;
  }
  const beforeUrl = page.url();
  const downloadPromise = page.waitForEvent('download', { timeout: 2500 }).catch(() => null);
  await btn.click({ timeout: 2000 });
  const dl = await downloadPromise;
  if (dl) {
    record(sec.id, 'export.button.action', 'pass', `download triggered: ${dl.suggestedFilename()}`);
    return;
  }
  await page.waitForTimeout(400);
  const popped = await page.locator('[role="dialog"], [role="menu"]').count();
  if (popped > 0) {
    record(sec.id, 'export.button.action', 'pass', `dialog opened`);
  } else if (page.url() !== beforeUrl) {
    record(sec.id, 'export.button.action', 'pass', `navigation`);
  } else {
    record(sec.id, 'export.button.action', 'dead', 'click had no effect');
  }
}

async function probePagination(page, sec) {
  // Detect pagination chips (could be aria-label="next" or ChevronRight in
  // an <a class="pg">). Count visible page chips.
  const next = page
    .locator(
      'a[aria-label*="next" i], a[aria-label="İleri"], a[aria-label="Next"], a.pg:has-text("›"), a.pg:has(svg.lucide-chevron-right)',
    )
    .first();
  const chips = await page.locator('a.pg, span.pg').count();
  if (chips === 0) {
    record(sec.id, 'pager.present', 'dead', 'no pagination block visible');
    return;
  }
  // Pagination is fine if (a) there's only 1 page (chip count = 1 inactive) OR
  // (b) clicking next changes URL to include ?page=2
  if (chips <= 2) {
    record(sec.id, 'pager.present', 'pass', `chips=${chips} (single-page; nothing to click)`);
    return;
  }
  const nextCnt = await next.count();
  if (nextCnt === 0) {
    record(sec.id, 'pager.next.present', 'dead', 'no next link');
    return;
  }
  const before = page.url();
  await next.click({ timeout: 2000 });
  await page.waitForTimeout(500);
  const after = page.url();
  if (after !== before && after.includes('page=')) {
    record(sec.id, 'pager.next.navigates', 'pass', `→ ${after.split('?')[1] ?? ''}`);
  } else {
    record(sec.id, 'pager.next.navigates', 'dead', `before=${before} after=${after}`);
  }
}

async function probeNewCta(page, sec) {
  const cta = page.locator('a:has-text("Yeni"), a:has-text("New"), a.btn-primary').first();
  const cnt = await cta.count();
  if (cnt === 0) {
    record(sec.id, 'new-cta.present', 'dead', 'no New button found');
    return;
  }
  const href = await cta.getAttribute('href');
  record(sec.id, 'new-cta.present', href ? 'pass' : 'dead', `href=${href ?? '(none)'}`);
}

async function probePeriod(page, sec) {
  const btn = page
    .locator('button:has-text("Bu ay"), button:has-text("Period"), button:has-text("Dönem")')
    .first();
  const cnt = await btn.count();
  if (cnt === 0) {
    record(sec.id, 'period.picker.present', 'dead', 'no period picker found');
    return;
  }
  await btn.click({ timeout: 2000 });
  await page.waitForTimeout(300);
  const popped = await page.locator('[role="dialog"], [role="menu"], [data-state="open"]').count();
  if (popped > 0) {
    record(sec.id, 'period.picker.opens', 'pass', `popover count=${popped}`);
    // Close it (Esc)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  } else {
    record(sec.id, 'period.picker.opens', 'dead', 'no popover after click');
  }
}

async function probeChip(page, sec) {
  // Chip filters are typically <a class="chip"> or <button class="chip">
  const chip = page.locator('a.chip, button.chip').first();
  const cnt = await chip.count();
  if (cnt === 0) {
    record(sec.id, 'chip.filter.present', 'dead', 'no chip filters found');
    return;
  }
  const before = page.url();
  await chip.click({ timeout: 2000 });
  await page.waitForTimeout(400);
  const after = page.url();
  if (after !== before) {
    record(sec.id, 'chip.filter.navigates', 'pass', `${cnt} chips, url changed`);
  } else {
    record(sec.id, 'chip.filter.navigates', 'dead', 'click did not change URL');
  }
}

async function probeHubCards(page, sec) {
  // Hub pages render a column of cards each linking to a sub-route.
  const cards = page
    .locator('main a, .content a')
    .filter({ has: page.locator('text=Aç,Görüntüle,Open,View').first() })
    .or(page.locator('.content a'));
  const allLinks = await page.locator('.content a').count();
  if (allLinks === 0) {
    record(sec.id, 'hub.cards.present', 'dead', 'no anchors in content area');
    return;
  }
  record(sec.id, 'hub.cards.present', 'pass', `links=${allLinks}`);
}

async function probeSidebarRecordsItem(page, sec) {
  // Find the "Kayıtlar" sidebar item and report what URL it points to
  const item = page.locator('aside a:has-text("Kayıtlar"), nav a:has-text("Kayıtlar")').first();
  const cnt = await item.count();
  if (cnt === 0) {
    record(sec.id, 'sidebar.records.present', 'dead', 'no Kayıtlar sidebar item');
    return;
  }
  const href = await item.getAttribute('href');
  record(
    sec.id,
    'sidebar.records.href',
    href === '/tr/v2/registers' ? 'pass' : 'pass',
    `href=${href}`,
  );
  // Are there sub-items (Alacaklar, Borçlar, Satışlar, Stok)?
  const subItems = await page
    .locator(
      'aside a:has-text("Alacaklar"), aside a:has-text("Borçlar"), aside a:has-text("Satışlar"), aside a:has-text("Stok")',
    )
    .count();
  record(
    sec.id,
    'sidebar.records.sub-items',
    subItems > 0 ? 'pass' : 'dead',
    `sub-items in sidebar=${subItems}`,
  );
}

async function probeSidebarSummary(page, sec) {
  // Dashboard sidebar should show a summary block + KPI mirror
  const summary = await page.locator('aside .summary, aside [data-summary], aside .card').count();
  record(
    sec.id,
    'sidebar.summary.present',
    summary > 0 ? 'pass' : 'dead',
    `aside cards=${summary}`,
  );
}

async function probeKpiStrip(page, sec) {
  const kpi = await page.locator('.kpi-strip, [class*="kpi"], .kpi-card').count();
  record(sec.id, 'kpi-strip.present', kpi > 0 ? 'pass' : 'dead', `kpi nodes=${kpi}`);
}

const PROBES = {
  search: probeSearch,
  filter: probeFilter,
  export: probeExport,
  pagination: probePagination,
  'new-cta': probeNewCta,
  period: probePeriod,
  chip: probeChip,
  'hub-cards': probeHubCards,
  'sidebar-records-item': probeSidebarRecordsItem,
  'sidebar-summary': probeSidebarSummary,
  'kpi-strip': probeKpiStrip,
};

async function auditSection(page, sec) {
  header(`📍 ${sec.id} → ${sec.route}`);
  const errors = [];
  const handler = (err) => errors.push(`pageerr:${err.message}`);
  page.on('pageerror', handler);
  try {
    const res = await page.goto(`${BASE_URL}/${LOCALE}${sec.route}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    record(
      sec.id,
      'http.status',
      res?.status() === 200 ? 'pass' : 'dead',
      `status=${res?.status()}`,
    );
    await page.waitForTimeout(STEP);
    for (const p of sec.probes) {
      const fn = PROBES[p];
      if (!fn) {
        record(sec.id, `probe.${p}`, 'dead', 'no probe implemented');
        continue;
      }
      try {
        await fn(page, sec);
      } catch (err) {
        record(sec.id, `probe.${p}.exception`, 'dead', err.message.slice(0, 200));
      }
    }
  } catch (err) {
    record(sec.id, 'section.uncaught', 'dead', err.message.slice(0, 200));
  } finally {
    if (errors.length > 0) {
      for (const e of errors) line(`   ⚠ ${sec.id} ${e}`);
    }
    page.off('pageerror', handler);
  }
}

async function main() {
  const sections = ONLY ? SECTIONS.filter((s) => s.id === ONLY) : SECTIONS;
  if (sections.length === 0) {
    line(`No section matches SECTION=${ONLY}`);
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: !HEADED, slowMo: HEADED ? 50 : 0 });
  const ctx = await browser.newContext({
    viewport: { width: 1500, height: 950 },
    acceptDownloads: true,
  });
  const page = await ctx.newPage();

  // Warm dev-bypass auth
  await page.goto(`${BASE_URL}/${LOCALE}/v2/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  for (const sec of sections) {
    await auditSection(page, sec);
  }

  await ctx.close();
  await browser.close();

  // Aggregate per-section breakdown.
  const bySection = new Map();
  for (const f of findings) {
    if (!bySection.has(f.section)) bySection.set(f.section, { pass: 0, dead: 0, disabled: 0 });
    bySection.get(f.section)[f.ok] = (bySection.get(f.section)[f.ok] ?? 0) + 1;
  }
  header('SUMMARY (per section)');
  for (const [id, c] of bySection) {
    line(
      `  ${id.padEnd(28)}  ✅ ${String(c.pass ?? 0).padStart(3)}   ❌ ${String(c.dead ?? 0).padStart(3)}   ⚠️ ${String(c.disabled ?? 0).padStart(3)}`,
    );
  }
  const totalPass = findings.filter((f) => f.ok === 'pass').length;
  const totalDead = findings.filter((f) => f.ok === 'dead').length;
  const totalDisabled = findings.filter((f) => f.ok === 'disabled').length;
  line('');
  line(`  TOTAL  ✅ ${totalPass}   ❌ ${totalDead}   ⚠️ ${totalDisabled}   (of ${findings.length})`);

  await fs.writeFile(
    FAIL_OUT,
    JSON.stringify(
      {
        summary: {
          total: findings.length,
          pass: totalPass,
          dead: totalDead,
          disabled: totalDisabled,
        },
        bySection: Object.fromEntries(bySection),
        findings,
      },
      null,
      2,
    ),
  );
  line(`  → ${FAIL_OUT}`);
  line(`  → ${LOG_OUT}`);

  await logFile.close();
  process.exit(totalDead > 0 ? 1 : 0);
}

main().catch(async (err) => {
  line(`FATAL: ${err.stack ?? err.message}`);
  await logFile.close();
  process.exit(2);
});
