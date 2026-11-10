/**
 * Tests over the report codegen output. Lock in the surface contract (2
 * read-only tools, names, scopes, per-tool schema behaviours) so accidental
 * regressions in the codegen template or descriptor table surface immediately.
 * Engine / fetcher behaviour itself lives under `lib/reports/*.test.ts`.
 *
 * Shared surface assertions (name set, non-empty descriptions, read scope)
 * are delegated to `assertToolContractShape`; this file keeps only the
 * per-tool input-schema behaviours that are domain-specific.
 *
 * `ar-aging` is the canonical sample reportId — it's the simplest report
 * (no params) and has been stable since Sprint 8.
 */
import { describe, expect, it } from 'vitest';
import { assertToolContractShape } from '../test-utils';
import { reportTools } from './report-tools';

describe('report tools', () => {
  it('matches the report tool contract (names + descriptions + scopes)', () => {
    assertToolContractShape(reportTools, {
      reads: ['report_list', 'report_run'],
      writes: [],
    });
  });

  it('report_list accepts empty input', () => {
    const t = reportTools.find((x) => x.name === 'report_list');
    expect(t?.inputSchema.safeParse({}).success).toBe(true);
  });

  it('report_list rejects extra input (no params accepted)', () => {
    // `z.object({})` in strict mode would reject, but Zod object schemas
    // default to "strip" — unknown keys silently dropped. Either behaviour
    // is acceptable for the LLM contract; this test just locks in the
    // current behaviour so future tightening is intentional.
    const t = reportTools.find((x) => x.name === 'report_list');
    expect(t?.inputSchema.safeParse({ foo: 'bar' }).success).toBe(true);
  });

  it('report_run rejects unknown reportId', () => {
    const t = reportTools.find((x) => x.name === 'report_run');
    expect(t?.inputSchema.safeParse({ reportId: 'totally.fake' }).success).toBe(false);
  });

  it('report_run accepts each registered reportId with no params', () => {
    const t = reportTools.find((x) => x.name === 'report_run');
    for (const id of [
      'ap-aging',
      'ar-aging',
      'gross-profit',
      'sales-by-customer',
      'sales-by-product',
    ]) {
      expect(t?.inputSchema.safeParse({ reportId: id }).success).toBe(true);
    }
  });

  it('report_run accepts params as an arbitrary record', () => {
    // The top-level schema is intentionally loose (`z.record(z.unknown())`)
    // — per-report Zod schemas re-validate inside the handler. The dispatch
    // layer doesn't need to know each report's shape.
    const t = reportTools.find((x) => x.name === 'report_run');
    expect(
      t?.inputSchema.safeParse({
        reportId: 'sales-by-customer',
        params: { from: '2026-01-01T00:00:00Z', to: '2026-01-31T23:59:59Z' },
      }).success,
    ).toBe(true);
  });

  it('report_run requires reportId', () => {
    const t = reportTools.find((x) => x.name === 'report_run');
    expect(t?.inputSchema.safeParse({}).success).toBe(false);
    expect(t?.inputSchema.safeParse({ params: { from: '2026-01-01T00:00:00Z' } }).success).toBe(
      false,
    );
  });
});
