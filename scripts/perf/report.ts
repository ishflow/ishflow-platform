// scripts/perf/report.ts
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { RouteMetrics } from './measure-page';

function pct(score: number): string {
  return `${Math.round(score * 100)}`;
}

function row(m: RouteMetrics): string {
  const lh = m.lighthouse;
  return [
    `| ${m.route.id} `,
    `| ${m.route.path} `,
    `| ${m.prisma.count} `,
    `| ${m.prisma.slowestMs}ms `,
    `| ${m.loadMs}ms `,
    `| ${m.ttfbMs}ms `,
    `| ${lh ? pct(lh.mobile.performance) : '-'} `,
    `| ${lh ? pct(lh.desktop.performance) : '-'} `,
    `| ${lh ? `${Math.round(lh.mobile.lcpMs)}ms` : '-'} `,
    `| ${m.navigationOk ? '✓' : `✗ ${m.error ?? ''}`} |`,
  ].join('');
}

export async function writeReport(target: string, results: RouteMetrics[]): Promise<void> {
  const header = [
    '# ishflow Performance Audit — 2026-05-13',
    '',
    'Local dev server on :3100 against Docker Postgres (`canalog_dev`).',
    'Owner role, demo tenant seed, locale `tr` except for super-admin.',
    '',
    '## Per-route metrics',
    '',
    '| Route | Path | Prisma queries | Slowest query | Load | TTFB | Lighthouse Mobile | Lighthouse Desktop | LCP (mobile) | OK |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ];
  const body = results.map(row);
  const slowest = [...results]
    .filter((r) => r.navigationOk)
    .sort((a, b) => b.prisma.count - a.prisma.count)
    .slice(0, 5);
  const slowestQueries = [...results]
    .filter((r) => r.navigationOk)
    .sort((a, b) => b.prisma.slowestMs - a.prisma.slowestMs)
    .slice(0, 5);
  const sections = [
    '',
    '## Top 5 routes by Prisma query count',
    '',
    ...slowest.map((r) => `- \`${r.route.path}\` — ${r.prisma.count} queries (${r.route.desc})`),
    '',
    '## Top 5 routes by slowest single query',
    '',
    ...slowestQueries.map(
      (r) =>
        `- \`${r.route.path}\` — ${r.prisma.slowestMs}ms: \`${r.prisma.slowestSql.slice(0, 120)}\``,
    ),
    '',
    '## Ranked problems (fill in after running)',
    '',
    '1. _populate from observation_',
    '2. _populate from observation_',
    '3. _populate from observation_',
    '4. _populate from observation_',
    '5. _populate from observation_',
    '',
  ];

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, [...header, ...body, ...sections].join('\n'), 'utf-8');
}
