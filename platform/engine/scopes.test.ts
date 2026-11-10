import type { AppContext, RoleScopeGroup } from '@/platform/auth/current-context';
import type { CatalogConfig } from '@/platform/metadata';
import { describe, expect, it } from 'vitest';
import { scopeMatches, scopeWhere } from './scopes';

const CONFIG: CatalogConfig = {
  id: 'sales.invoice',
  module: 'sales',
  name: 'invoice',
  label: { en: 'Invoice' },
  fields: {},
  permissions: {},
};

function ctxWith(groups: Record<string, RoleScopeGroup[]>, userId = 'user-1'): AppContext {
  return {
    user: { id: userId } as never,
    tenant: { id: 't' } as never,
    membership: { id: 'm' } as never,
    permissions: new Set<string>(),
    scopesByEntity: new Map(Object.entries(groups)),
    addons: new Set(),
  };
}

describe('scopeWhere', () => {
  it('no groups → undefined (no filter)', () => {
    expect(scopeWhere(ctxWith({}), CONFIG, 'read')).toBeUndefined();
  });

  it('any role with empty rules → undefined (unrestricted)', () => {
    const ctx = ctxWith({ 'sales.invoice': [{ roleId: 'r', rules: [] }] });
    expect(scopeWhere(ctx, CONFIG, 'read')).toBeUndefined();
  });

  it('single-role single-rule equals produces {field: value}', () => {
    const ctx = ctxWith({
      'sales.invoice': [
        {
          roleId: 'r',
          rules: [
            { entityId: 'sales.invoice', field: 'warehouseId', operator: 'equals', value: 'w1' },
          ],
        },
      ],
    });
    expect(scopeWhere(ctx, CONFIG, 'read')).toEqual({ warehouseId: 'w1' });
  });

  it('single-role multi-rule → AND', () => {
    const ctx = ctxWith({
      'sales.invoice': [
        {
          roleId: 'r',
          rules: [
            { entityId: 'sales.invoice', field: 'warehouseId', operator: 'equals', value: 'w1' },
            { entityId: 'sales.invoice', field: 'status', operator: 'equals', value: 'POSTED' },
          ],
        },
      ],
    });
    expect(scopeWhere(ctx, CONFIG, 'read')).toEqual({
      AND: [{ warehouseId: 'w1' }, { status: 'POSTED' }],
    });
  });

  it('two roles same entity → OR', () => {
    const ctx = ctxWith({
      'sales.invoice': [
        {
          roleId: 'a',
          rules: [
            {
              entityId: 'sales.invoice',
              field: 'warehouseId',
              operator: 'equals',
              value: 'moscow',
            },
          ],
        },
        {
          roleId: 'b',
          rules: [
            {
              entityId: 'sales.invoice',
              field: 'warehouseId',
              operator: 'equals',
              value: 'spb',
            },
          ],
        },
      ],
    });
    expect(scopeWhere(ctx, CONFIG, 'read')).toEqual({
      OR: [{ warehouseId: 'moscow' }, { warehouseId: 'spb' }],
    });
  });

  it('operator in_ emits Prisma { in: [...] }', () => {
    const ctx = ctxWith({
      'sales.invoice': [
        {
          roleId: 'r',
          rules: [
            { entityId: 'sales.invoice', field: 'warehouseId', operator: 'in_', value: ['a', 'b'] },
          ],
        },
      ],
    });
    expect(scopeWhere(ctx, CONFIG, 'read')).toEqual({ warehouseId: { in: ['a', 'b'] } });
  });

  it('contextEquals $context.userId resolves from ctx', () => {
    const ctx = ctxWith(
      {
        'sales.invoice': [
          {
            roleId: 'r',
            rules: [
              {
                entityId: 'sales.invoice',
                field: 'managerId',
                operator: 'contextEquals',
                value: '$context.userId',
              },
            ],
          },
        ],
      },
      'user-42',
    );
    expect(scopeWhere(ctx, CONFIG, 'read')).toEqual({ managerId: 'user-42' });
  });

  it('unknown $context.XXX → {id: "__never__"} (deny)', () => {
    const ctx = ctxWith({
      'sales.invoice': [
        {
          roleId: 'r',
          rules: [
            {
              entityId: 'sales.invoice',
              field: 'f',
              operator: 'contextEquals',
              value: '$context.wat',
            },
          ],
        },
      ],
    });
    expect(scopeWhere(ctx, CONFIG, 'read')).toEqual({ id: '__never__' });
  });
});

it('currentUser resolves to ctx.user.id', () => {
  const ctx = ctxWith(
    {
      'sales.invoice': [
        {
          roleId: 'r',
          rules: [
            {
              entityId: 'sales.invoice',
              field: 'assignedRepId',
              operator: 'currentUser',
              value: null,
            },
          ],
        },
      ],
    },
    'user-42',
  );
  expect(scopeWhere(ctx, CONFIG, 'read')).toEqual({ assignedRepId: 'user-42' });
});

it('currentUser combined with AND', () => {
  const ctx = ctxWith(
    {
      'sales.invoice': [
        {
          roleId: 'r',
          rules: [
            {
              entityId: 'sales.invoice',
              field: 'assignedRepId',
              operator: 'currentUser',
              value: null,
            },
            {
              entityId: 'sales.invoice',
              field: 'status',
              operator: 'equals',
              value: 'POSTED',
            },
          ],
        },
      ],
    },
    'user-42',
  );
  expect(scopeWhere(ctx, CONFIG, 'read')).toEqual({
    AND: [{ assignedRepId: 'user-42' }, { status: 'POSTED' }],
  });
});

it('currentUser missing user id falls back to deny', () => {
  const ctx = ctxWith(
    {
      'sales.invoice': [
        {
          roleId: 'r',
          rules: [
            {
              entityId: 'sales.invoice',
              field: 'assignedRepId',
              operator: 'currentUser',
              value: null,
            },
          ],
        },
      ],
    },
    '',
  );
  expect(scopeWhere(ctx, CONFIG, 'read')).toEqual({ id: '__never__' });
});

describe('scopeMatches', () => {
  it('no groups → true', () => {
    expect(scopeMatches(ctxWith({}), CONFIG, { warehouseId: 'w1' })).toBe(true);
  });

  it('any role with empty rules → true', () => {
    const ctx = ctxWith({ 'sales.invoice': [{ roleId: 'r', rules: [] }] });
    expect(scopeMatches(ctx, CONFIG, { warehouseId: 'whatever' })).toBe(true);
  });

  it('equals passes when record field matches', () => {
    const ctx = ctxWith({
      'sales.invoice': [
        {
          roleId: 'r',
          rules: [
            { entityId: 'sales.invoice', field: 'warehouseId', operator: 'equals', value: 'w1' },
          ],
        },
      ],
    });
    expect(scopeMatches(ctx, CONFIG, { warehouseId: 'w1' })).toBe(true);
    expect(scopeMatches(ctx, CONFIG, { warehouseId: 'other' })).toBe(false);
  });

  it('two roles OR: record in either set passes', () => {
    const ctx = ctxWith({
      'sales.invoice': [
        {
          roleId: 'a',
          rules: [
            {
              entityId: 'sales.invoice',
              field: 'warehouseId',
              operator: 'equals',
              value: 'moscow',
            },
          ],
        },
        {
          roleId: 'b',
          rules: [
            {
              entityId: 'sales.invoice',
              field: 'warehouseId',
              operator: 'equals',
              value: 'spb',
            },
          ],
        },
      ],
    });
    expect(scopeMatches(ctx, CONFIG, { warehouseId: 'moscow' })).toBe(true);
    expect(scopeMatches(ctx, CONFIG, { warehouseId: 'spb' })).toBe(true);
    expect(scopeMatches(ctx, CONFIG, { warehouseId: 'kazan' })).toBe(false);
  });

  it('contextEquals matches record against resolved context value', () => {
    const ctx = ctxWith(
      {
        'sales.invoice': [
          {
            roleId: 'r',
            rules: [
              {
                entityId: 'sales.invoice',
                field: 'managerId',
                operator: 'contextEquals',
                value: '$context.userId',
              },
            ],
          },
        ],
      },
      'user-42',
    );
    expect(scopeMatches(ctx, CONFIG, { managerId: 'user-42' })).toBe(true);
    expect(scopeMatches(ctx, CONFIG, { managerId: 'someone-else' })).toBe(false);
  });
});
