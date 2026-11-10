import { describe, expect, it } from 'vitest';
import { stripManagedFields } from './crud';

/**
 * Finding B1: mobile + MCP write paths don't run the web actions' Zod allowlist,
 * so raw client JSON reached createRecord/updateRecord. The engine must drop
 * server-managed columns itself — especially `deletedAt` (create-as-deleted /
 * un-archive) and `id`/`tenantId` — so no channel can mass-assign them.
 */
describe('stripManagedFields', () => {
  it('drops server-managed columns but keeps real catalog fields', () => {
    const out = stripManagedFields({
      name: 'Acme',
      code: 'A1',
      deletedAt: null,
      id: 'attacker-chosen',
      tenantId: 'other-tenant',
      createdAt: '2020-01-01',
      updatedAt: '2020-01-01',
    });
    expect(out).toEqual({ name: 'Acme', code: 'A1' });
  });

  it('is a no-op for clean input', () => {
    expect(stripManagedFields({ name: 'X', price: 10 })).toEqual({ name: 'X', price: 10 });
  });
});
