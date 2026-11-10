/**
 * Tests over the register codegen output. Lock in the surface contract (3
 * read-only tools, names, scopes) so accidental regressions in the codegen
 * template surface immediately. Engine behaviour itself lives under
 * `platform/engine/register-query.test.ts`.
 *
 * Shared surface assertions (name set, non-empty descriptions, read scope)
 * are delegated to `assertToolContractShape`; this file keeps only the
 * per-tool input-schema behaviours that are domain-specific.
 *
 * `sales.accounts_receivable` is used as the canonical sample registerId
 * — it's the first accumulation register added back in Sprint 8 and has
 * been stable across the codebase since.
 */
import { describe, expect, it } from 'vitest';
import { assertToolContractShape } from '../test-utils';
import { registerTools } from './register-tools';

describe('register tools', () => {
  it('matches the register tool contract (names + descriptions + scopes)', () => {
    assertToolContractShape(registerTools, {
      reads: ['register_balance', 'register_turnover', 'register_movements'],
      writes: [],
    });
  });

  it('register_balance accepts default (no dims, no asOf)', () => {
    const t = registerTools.find((x) => x.name === 'register_balance');
    expect(
      t?.inputSchema.safeParse({ registerId: 'sales.accounts_receivable' }).success,
    ).toBe(true);
  });

  it('register_balance accepts optional dims + asOf', () => {
    const t = registerTools.find((x) => x.name === 'register_balance');
    expect(
      t?.inputSchema.safeParse({
        registerId: 'sales.accounts_receivable',
        dims: { counterparty: '00000000-0000-0000-0000-000000000000' },
        asOf: '2026-05-24T12:00:00Z',
      }).success,
    ).toBe(true);
  });

  it('register_balance rejects non-ISO asOf', () => {
    const t = registerTools.find((x) => x.name === 'register_balance');
    expect(
      t?.inputSchema.safeParse({
        registerId: 'sales.accounts_receivable',
        asOf: 'yesterday',
      }).success,
    ).toBe(false);
  });

  it('register_balance rejects an unknown registerId', () => {
    const t = registerTools.find((x) => x.name === 'register_balance');
    expect(
      t?.inputSchema.safeParse({ registerId: 'totally.fake_register' }).success,
    ).toBe(false);
  });

  it('register_turnover requires from + to', () => {
    const t = registerTools.find((x) => x.name === 'register_turnover');
    expect(
      t?.inputSchema.safeParse({ registerId: 'sales.accounts_receivable' }).success,
    ).toBe(false);
    expect(
      t?.inputSchema.safeParse({
        registerId: 'sales.accounts_receivable',
        from: '2026-05-01T00:00:00Z',
      }).success,
    ).toBe(false);
    expect(
      t?.inputSchema.safeParse({
        registerId: 'sales.accounts_receivable',
        from: '2026-05-01T00:00:00Z',
        to: '2026-05-31T23:59:59Z',
      }).success,
    ).toBe(true);
  });

  it('register_turnover accepts optional groupBy + dims', () => {
    const t = registerTools.find((x) => x.name === 'register_turnover');
    expect(
      t?.inputSchema.safeParse({
        registerId: 'sales.accounts_receivable',
        dims: { currency: 'USD' },
        groupBy: ['counterparty'],
        from: '2026-05-01T00:00:00Z',
        to: '2026-05-31T23:59:59Z',
      }).success,
    ).toBe(true);
    // Empty groupBy is valid — engine treats it as "single aggregate row".
    expect(
      t?.inputSchema.safeParse({
        registerId: 'sales.accounts_receivable',
        groupBy: [],
        from: '2026-05-01T00:00:00Z',
        to: '2026-05-31T23:59:59Z',
      }).success,
    ).toBe(true);
  });

  it('register_turnover rejects non-ISO date strings', () => {
    const t = registerTools.find((x) => x.name === 'register_turnover');
    expect(
      t?.inputSchema.safeParse({
        registerId: 'sales.accounts_receivable',
        from: 'not-iso',
        to: '2026-05-31T23:59:59Z',
      }).success,
    ).toBe(false);
  });

  it('register_movements rejects non-ISO from/to', () => {
    const t = registerTools.find((x) => x.name === 'register_movements');
    expect(
      t?.inputSchema.safeParse({
        registerId: 'sales.accounts_receivable',
        from: 'not-iso',
      }).success,
    ).toBe(false);
  });

  it('register_movements accepts pagination + includeInactive', () => {
    const t = registerTools.find((x) => x.name === 'register_movements');
    expect(
      t?.inputSchema.safeParse({
        registerId: 'sales.accounts_receivable',
        page: 2,
        pageSize: 100,
        includeInactive: true,
      }).success,
    ).toBe(true);
  });

  it('register_movements rejects pageSize > 200', () => {
    const t = registerTools.find((x) => x.name === 'register_movements');
    expect(
      t?.inputSchema.safeParse({
        registerId: 'sales.accounts_receivable',
        pageSize: 9999,
      }).success,
    ).toBe(false);
  });

  it('does not expose information registers (e.g. inventory.product_price)', () => {
    // Information registers have a distinct query surface and are deferred
    // to a Phase-2 codegen pass. Asserting their absence catches accidental
    // inclusion via getRegistry().register (which is the union map).
    const t = registerTools.find((x) => x.name === 'register_balance');
    expect(
      t?.inputSchema.safeParse({ registerId: 'inventory.product_price' }).success,
    ).toBe(false);
  });
});
