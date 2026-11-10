import type { AppContext } from '@/platform/auth/current-context';
import { defineCatalog, defineDocument, field } from '@/platform/metadata';
import { clearRegistry } from '@/platform/metadata/registry';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPresentationByRef, getPresentationsByRefs } from './presentation';

function makeCtx(tenantId = '00000000-0000-0000-0000-000000000001'): AppContext {
  // Shape-only test doubles — production Tenant/User/Membership types carry
  // Prisma-generated enum fields we don't need for these unit tests.
  return {
    tenant: { id: tenantId, name: 'Test', slug: 'test' } as unknown as AppContext['tenant'],
    user: { id: 'u1', clerkId: 'c1' } as unknown as AppContext['user'],
    membership: {
      id: 'm1',
      tenantId,
      userId: 'u1',
      roles: ['admin'],
    } as unknown as AppContext['membership'],
    permissions: new Set<string>(['*:*']),
    scopesByEntity: new Map(),
    addons: new Set(),
  };
}

type FakeRecord = Record<string, unknown>;

function fakeTx(bag: Record<string, Record<string, FakeRecord>>) {
  const build = (records: Record<string, FakeRecord>) => ({
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => records[where.id] ?? null),
    findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
      where.id.in.map((id) => records[id]).filter((r): r is FakeRecord => Boolean(r)),
    ),
  });
  return Object.fromEntries(Object.entries(bag).map(([k, v]) => [k, build(v)])) as never;
}

describe('getPresentationByRef', () => {
  beforeEach(() => {
    clearRegistry();
  });
  afterEach(() => {
    clearRegistry();
  });

  it('resolves a valid catalog ref through getPresentation', async () => {
    defineCatalog({
      module: 'test',
      name: 'thing',
      label: { en: 'Thing' },
      fields: {
        name: field.string({ label: { en: 'Name' }, required: true }),
      },
      permissions: { read: 'any', write: 'any' },
      displayField: 'name',
    });
    const tx = fakeTx({ catalog_test_thing: { r1: { id: 'r1', name: 'Alice' } } });
    const result = await getPresentationByRef(makeCtx(), 'test.thing', 'r1', { tx });
    expect(result).toBe('Alice');
  });

  it('falls back to short id on missing record', async () => {
    defineCatalog({
      module: 'test',
      name: 'thing',
      label: { en: 'Thing' },
      fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
      displayField: 'name',
    });
    const tx = fakeTx({ catalog_test_thing: {} });
    const result = await getPresentationByRef(
      makeCtx(),
      'test.thing',
      '11111111-2222-3333-4444-555555555555',
      { tx },
    );
    expect(result).toBe('11111111');
  });

  it('falls back to short id on unknown typeId', async () => {
    const tx = fakeTx({});
    const result = await getPresentationByRef(
      makeCtx(),
      'nope.nada',
      '11111111-2222-3333-4444-555555555555',
      { tx },
    );
    expect(result).toBe('11111111');
  });

  it('returns "—" on empty id regardless of type', async () => {
    const tx = fakeTx({});
    expect(await getPresentationByRef(makeCtx(), 'test.thing', '', { tx })).toBe('—');
    expect(await getPresentationByRef(makeCtx(), 'nope.nada', '', { tx })).toBe('—');
  });

  it('respects locale when config has a localized presentation()', async () => {
    defineCatalog({
      module: 'test',
      name: 'thing',
      label: { en: 'Thing', ru: 'Вещь' },
      fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
      presentation: (r) => `Item: ${r.name}`,
    });
    const tx = fakeTx({ catalog_test_thing: { r1: { id: 'r1', name: 'Alice' } } });
    const result = await getPresentationByRef(makeCtx(), 'test.thing', 'r1', {
      tx,
      locale: 'ru',
    });
    expect(result).toBe('Item: Alice');
  });

  it('resolves a document ref via registry document map', async () => {
    defineDocument({
      module: 'test',
      name: 'doc',
      label: { en: 'Doc' },
      pluralLabel: { en: 'Docs' },
      header: {
        date: field.datetime({ required: true, label: { en: 'Date' }, default: 'now' }),
      },
      posting: {},
      permissions: {
        read: 'any',
        write: 'any',
        post: 'any',
        unpost: 'any',
        delete: 'any',
      },
    });
    const tx = fakeTx({
      document_test_doc: {
        d1: { id: 'd1', number: 'D-001', date: new Date('2026-04-16') },
      },
    });
    const result = await getPresentationByRef(makeCtx(), 'test.doc', 'd1', { tx });
    expect(result).toBe('Doc D-001 — 2026-04-16');
  });
});

describe('getPresentationsByRefs', () => {
  beforeEach(() => {
    clearRegistry();
  });
  afterEach(() => {
    clearRegistry();
  });

  it('returns empty map for empty id array', async () => {
    const tx = fakeTx({});
    const result = await getPresentationsByRefs(makeCtx(), 'test.thing', [], { tx });
    expect(result.size).toBe(0);
  });

  it('filters out empty string ids before issuing the query', async () => {
    defineCatalog({
      module: 'test',
      name: 'thing',
      label: { en: 'Thing' },
      fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
      displayField: 'name',
    });
    const tx = fakeTx({ catalog_test_thing: {} });
    const result = await getPresentationsByRefs(makeCtx(), 'test.thing', ['', '   '], { tx });
    // Neither id survives the filter, so the map stays empty.
    // (Note: '   ' is length>0, so it passes the length filter; findUnique misses it.)
    // Empty string definitely filtered out.
    expect(result.has('')).toBe(false);
  });

  it('batches valid + invalid ids with short-id fallback', async () => {
    defineCatalog({
      module: 'test',
      name: 'thing',
      label: { en: 'Thing' },
      fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
      displayField: 'name',
    });
    const tx = fakeTx({
      catalog_test_thing: {
        r1: { id: 'r1', name: 'Alice' },
        r2: { id: 'r2', name: 'Bob' },
      },
    });
    const result = await getPresentationsByRefs(
      makeCtx(),
      'test.thing',
      ['r1', 'r2', 'deadbeef-0000-0000-0000-000000000000'],
      { tx },
    );
    expect(result.get('r1')).toBe('Alice');
    expect(result.get('r2')).toBe('Bob');
    expect(result.get('deadbeef-0000-0000-0000-000000000000')).toBe('deadbeef');
  });

  it('deduplicates repeated ids', async () => {
    defineCatalog({
      module: 'test',
      name: 'thing',
      label: { en: 'Thing' },
      fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
      displayField: 'name',
    });
    const tx = fakeTx({
      catalog_test_thing: { r1: { id: 'r1', name: 'Alice' } },
    });
    const result = await getPresentationsByRefs(makeCtx(), 'test.thing', ['r1', 'r1', 'r1'], {
      tx,
    });
    expect(result.size).toBe(1);
    expect(result.get('r1')).toBe('Alice');
  });

  it('short-id-fallbacks every id when typeId is unknown', async () => {
    const tx = fakeTx({});
    const result = await getPresentationsByRefs(
      makeCtx(),
      'nope.nada',
      ['aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000'],
      { tx },
    );
    expect(result.get('aaaaaaaa-0000-0000-0000-000000000000')).toBe('aaaaaaaa');
    expect(result.get('bbbbbbbb-0000-0000-0000-000000000000')).toBe('bbbbbbbb');
  });
});
