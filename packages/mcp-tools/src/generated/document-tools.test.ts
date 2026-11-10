/**
 * Tests over the document codegen output. Lock in the surface contract (6
 * tools, names, scopes) so accidental regressions in the codegen template
 * surface immediately. Engine behaviour itself lives under
 * `platform/engine/document-crud.test.ts` and `platform/engine/posting.test.ts`.
 *
 * Shared surface assertions (name set, non-empty descriptions, read/write
 * scopes) are delegated to `assertToolContractShape`; this file keeps only
 * the per-tool input-schema behaviours that are domain-specific.
 */
import { describe, expect, it } from 'vitest';
import { assertToolContractShape } from '../test-utils';
import { documentTools } from './document-tools';

describe('document tools', () => {
  it('matches the document tool contract (names + descriptions + scopes)', () => {
    assertToolContractShape(documentTools, {
      reads: ['document_list', 'document_get'],
      writes: ['document_create', 'document_post', 'document_unpost', 'document_clone'],
    });
  });

  it('document_list rejects pageSize > 100', () => {
    const list = documentTools.find((t) => t.name === 'document_list');
    const r = list?.inputSchema.safeParse({ configId: 'sales.invoice', pageSize: 9999 });
    expect(r?.success).toBe(false);
  });

  it('document_list accepts default pagination', () => {
    const list = documentTools.find((t) => t.name === 'document_list');
    const r = list?.inputSchema.safeParse({ configId: 'sales.invoice' });
    expect(r?.success).toBe(true);
  });

  it('document_list accepts status + date range filters', () => {
    const list = documentTools.find((t) => t.name === 'document_list');
    const r = list?.inputSchema.safeParse({
      configId: 'sales.invoice',
      status: 'POSTED',
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-12-31T23:59:59.000Z',
    });
    expect(r?.success).toBe(true);
  });

  it('document_list rejects an unsupported status', () => {
    const list = documentTools.find((t) => t.name === 'document_list');
    const r = list?.inputSchema.safeParse({ configId: 'sales.invoice', status: 'DRAFT' });
    expect(r?.success).toBe(false);
  });

  it('document_list requires a known configId', () => {
    const list = documentTools.find((t) => t.name === 'document_list');
    const r = list?.inputSchema.safeParse({ configId: 'totally.not.a.doc' });
    expect(r?.success).toBe(false);
  });

  it('document_get rejects non-UUID ids', () => {
    const t = documentTools.find((x) => x.name === 'document_get');
    expect(
      t?.inputSchema.safeParse({ configId: 'sales.invoice', id: 'not-uuid' }).success,
    ).toBe(false);
    expect(
      t?.inputSchema.safeParse({
        configId: 'sales.invoice',
        id: '00000000-0000-0000-0000-000000000000',
      }).success,
    ).toBe(true);
  });

  it('document_create rejects missing fields object', () => {
    const create = documentTools.find((t) => t.name === 'document_create');
    const r = create?.inputSchema.safeParse({ configId: 'sales.invoice' });
    expect(r?.success).toBe(false);
  });

  it('document_create accepts a fields record (lines live inside fields)', () => {
    const create = documentTools.find((t) => t.name === 'document_create');
    const r = create?.inputSchema.safeParse({
      configId: 'sales.invoice',
      fields: {
        date: '2026-05-24',
        customer: '00000000-0000-0000-0000-000000000000',
        lines: { items: [{ product: '00000000-0000-0000-0000-000000000001', quantity: 1 }] },
      },
    });
    expect(r?.success).toBe(true);
  });

  it('document_post rejects unknown configId', () => {
    const t = documentTools.find((x) => x.name === 'document_post');
    expect(
      t?.inputSchema.safeParse({
        configId: 'totally.not.a.doc',
        id: '00000000-0000-0000-0000-000000000000',
      }).success,
    ).toBe(false);
  });

  it('document_post + document_unpost require uuid id', () => {
    for (const name of ['document_post', 'document_unpost']) {
      const t = documentTools.find((x) => x.name === name);
      expect(
        t?.inputSchema.safeParse({ configId: 'sales.invoice', id: 'not-uuid' }).success,
      ).toBe(false);
      expect(
        t?.inputSchema.safeParse({
          configId: 'sales.invoice',
          id: '00000000-0000-0000-0000-000000000000',
        }).success,
      ).toBe(true);
    }
  });

  it('document_clone requires sourceId (not id)', () => {
    const t = documentTools.find((x) => x.name === 'document_clone');
    // sourceId is required; passing { configId, id } fails Zod parse because
    // sourceId is missing — not because id is rejected (Zod ignores unknown keys).
    expect(
      t?.inputSchema.safeParse({
        configId: 'sales.invoice',
        id: '00000000-0000-0000-0000-000000000000',
      }).success,
    ).toBe(false);
    expect(
      t?.inputSchema.safeParse({
        configId: 'sales.invoice',
        sourceId: '00000000-0000-0000-0000-000000000000',
      }).success,
    ).toBe(true);
  });

  it('document_list rejects non-ISO dateFrom / dateTo', () => {
    const t = documentTools.find((x) => x.name === 'document_list')!;
    expect(
      t.inputSchema.safeParse({ configId: 'sales.invoice', dateFrom: 'not-iso' }).success,
    ).toBe(false);
    expect(
      t.inputSchema.safeParse({ configId: 'sales.invoice', dateTo: '2026-13-99' }).success,
    ).toBe(false);
    expect(
      t.inputSchema.safeParse({
        configId: 'sales.invoice',
        dateFrom: '2026-05-01T00:00:00Z',
        dateTo: '2026-05-31T23:59:59Z',
      }).success,
    ).toBe(true);
  });
});
