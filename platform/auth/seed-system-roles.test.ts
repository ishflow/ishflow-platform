import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { SYSTEM_ROLE_DEFS, seedSystemRoles } from './seed-system-roles';

type RoleRow = {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
};

type ScopeRow = {
  id: string;
  roleId: string;
  entityId: string;
  field: string;
  operator: string;
  value: unknown;
  isSystem: boolean;
};

let roleIdCounter = 1;
let scopeIdCounter = 1;

function fakeTx() {
  const upserted: RoleRow[] = [];
  const scopes: ScopeRow[] = [];
  const tx = {
    role: {
      upsert: vi.fn(
        async (args: {
          where: { tenantId_name: { tenantId: string; name: string } };
          create: Omit<RoleRow, 'id'>;
          update: Partial<Omit<RoleRow, 'id'>>;
        }) => {
          const idx = upserted.findIndex(
            (r) =>
              r.tenantId === args.where.tenantId_name.tenantId &&
              r.name === args.where.tenantId_name.name,
          );
          if (idx === -1) {
            const row: RoleRow = { id: `role-${roleIdCounter++}`, ...args.create };
            upserted.push(row);
            return row;
          }
          const existing = upserted[idx] as RoleRow;
          const merged: RoleRow = { ...existing, ...args.update };
          upserted[idx] = merged;
          return merged;
        },
      ),
    },
    roleScope: {
      deleteMany: vi.fn(async (args: { where: { roleId: string; isSystem: boolean } }) => {
        const idxs = scopes
          .map((s, i) => ({ s, i }))
          .filter(({ s }) => s.roleId === args.where.roleId && s.isSystem === args.where.isSystem)
          .map(({ i }) => i)
          .sort((a, b) => b - a);
        for (const i of idxs) scopes.splice(i, 1);
        return { count: idxs.length };
      }),
      createMany: vi.fn(
        async (args: {
          data: Array<Omit<ScopeRow, 'id'>>;
        }) => {
          for (const d of args.data) {
            scopes.push({ id: `scope-${scopeIdCounter++}`, ...d });
          }
          return { count: args.data.length };
        },
      ),
    },
  };
  return { tx: tx as unknown as Prisma.TransactionClient, upserted, scopes };
}

describe('seedSystemRoles', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';

  it('seeds all 9 built-in roles', async () => {
    const { tx, upserted } = fakeTx();
    await seedSystemRoles(tenantId, tx);
    const names = upserted.map((r) => r.name).sort();
    expect(names).toEqual([
      'admin',
      'bookkeeper',
      'buyer',
      'cashier',
      'chief_accountant',
      'owner',
      'sales',
      'viewer',
      'warehouse',
    ]);
    for (const r of upserted) {
      expect(r.isSystem).toBe(true);
      expect(r.tenantId).toBe(tenantId);
    }
  });

  it('assigns *:* + owner-exclusive keys + reports:read + admin.billing:manage + admin.organization:{edit,delete} to owner', async () => {
    const { tx, upserted } = fakeTx();
    await seedSystemRoles(tenantId, tx);
    const owner = upserted.find((r) => r.name === 'owner');
    expect(owner?.permissions).toContain('*:*');
    expect(owner?.permissions).toContain('owner:tenant_delete');
    expect(owner?.permissions).toContain('reports:read');
    expect(owner?.permissions).toContain('admin.billing:manage');
    expect(owner?.permissions).toContain('admin.organization:edit');
    expect(owner?.permissions).toContain('admin.organization:delete');
    expect(owner?.permissions).toContain('admin.audit:read');
    expect(owner?.permissions).toHaveLength(14);
  });

  it('assigns *:* + reports:read + admin.organization:edit to admin', async () => {
    const { tx, upserted } = fakeTx();
    await seedSystemRoles(tenantId, tx);
    const admin = upserted.find((r) => r.name === 'admin');
    expect(admin?.permissions).toEqual([
      '*:*',
      'reports:read',
      'admin.organization:edit',
      'admin.audit:read',
      'inventory.product:write',
      'inventory.product_category:write',
      'inventory.product_group:write',
      'platform.currency:write',
      'sales.price_type:write',
      'sales.price_agreement:write',
      'sales.invoice:send_email',
    ]);
  });

  it('viewer is read-only everywhere, incl. all report buckets', async () => {
    const { tx, upserted } = fakeTx();
    await seedSystemRoles(tenantId, tx);
    const viewer = upserted.find((r) => r.name === 'viewer');
    expect(viewer?.permissions).toContain('*:read');
    for (const b of ['financial', 'sales', 'purchases', 'inventory', 'payments']) {
      expect(viewer?.permissions).toContain(`reports.${b}:read`);
    }
    // never any write/post/unpost/delete/manage
    expect(viewer?.permissions.some((p) => /:(write|post|unpost|delete|manage)$/.test(p))).toBe(
      false,
    );
  });

  it('is idempotent — second run produces same state', async () => {
    const { tx, upserted } = fakeTx();
    await seedSystemRoles(tenantId, tx);
    const snap = JSON.stringify(upserted);
    await seedSystemRoles(tenantId, tx);
    expect(JSON.stringify(upserted)).toBe(snap);
  });

  it('seeds 3 default scopes for sales role', async () => {
    const { tx, scopes } = fakeTx();
    await seedSystemRoles(tenantId, tx);
    const salesScopes = scopes.filter((s) => s.entityId.startsWith('sales.'));
    expect(salesScopes).toHaveLength(3);
    expect(salesScopes.map((s) => s.entityId).sort()).toEqual([
      'sales.customer',
      'sales.invoice',
      'sales.payment_received',
    ]);
    for (const s of salesScopes) {
      expect(s.field).toBe('assignedRepId');
      expect(s.operator).toBe('currentUser');
      expect(s.isSystem).toBe(true);
    }
  });

  it('re-seed replaces system scopes but keeps custom scopes', async () => {
    const { tx, upserted, scopes } = fakeTx();
    await seedSystemRoles(tenantId, tx);
    const salesRole = upserted.find((r) => r.name === 'sales');
    if (!salesRole) throw new Error('sales role not found');
    // inject a custom (non-system) scope
    scopes.push({
      id: 'custom-1',
      roleId: salesRole.id,
      entityId: 'sales.customer',
      field: 'region',
      operator: 'equals',
      value: 'east',
      isSystem: false,
    });
    // re-seed
    await seedSystemRoles(tenantId, tx);
    const salesScopes = scopes.filter((s) => s.roleId === salesRole.id);
    // 3 system scopes + 1 preserved custom
    expect(salesScopes).toHaveLength(4);
    expect(salesScopes.filter((s) => s.isSystem)).toHaveLength(3);
    expect(salesScopes.filter((s) => !s.isSystem)).toHaveLength(1);
    expect(salesScopes.find((s) => s.id === 'custom-1')).toBeDefined();
  });

  it('exports definitions for 9 roles', () => {
    expect(Object.keys(SYSTEM_ROLE_DEFS).sort()).toEqual([
      'admin',
      'bookkeeper',
      'buyer',
      'cashier',
      'chief_accountant',
      'owner',
      'sales',
      'viewer',
      'warehouse',
    ]);
  });

  it('bookkeeper gets financial permissions but no inventory pricing', async () => {
    const { tx, upserted } = fakeTx();
    await seedSystemRoles(tenantId, tx);
    const bk = upserted.find((r) => r.name === 'bookkeeper');
    expect(bk?.permissions).toContain('sales.invoice:write');
    expect(bk?.permissions).toContain('purchases.invoice:write');
    expect(bk?.permissions).not.toContain('admin.period:manage');
    expect(bk?.permissions).not.toContain('admin.fx:manage');
    expect(bk?.permissions).not.toContain('admin.currency:manage');
    expect(bk?.permissions).not.toContain('admin.audit:read');
    expect(bk?.permissions).not.toContain('inventory.product:write');
    expect(bk?.permissions).not.toContain('*:*');
  });

  it('chief_accountant has all bookkeeper permissions plus elevated admin ones', async () => {
    const { tx, upserted } = fakeTx();
    await seedSystemRoles(tenantId, tx);
    const ca = upserted.find((r) => r.name === 'chief_accountant');
    expect(ca?.permissions).toContain('sales.invoice:write');
    expect(ca?.permissions).toContain('purchases.invoice:write');
    expect(ca?.permissions).toContain('admin.period:manage');
    expect(ca?.permissions).toContain('admin.fx:manage');
    expect(ca?.permissions).toContain('admin.currency:manage');
    // Audit log is system-wide security oversight — owner/admin only, NOT a
    // financial-officer concern. chief_accountant must not see it.
    expect(ca?.permissions).not.toContain('admin.audit:read');
    expect(ca?.permissions).not.toContain('inventory.product:write');
    expect(ca?.permissions).not.toContain('*:*');
  });

  it('cashier has payment-only write + invoice read', async () => {
    const { tx, upserted } = fakeTx();
    await seedSystemRoles(tenantId, tx);
    const cashier = upserted.find((r) => r.name === 'cashier');
    expect(cashier?.permissions).toContain('sales.payment_received:write');
    expect(cashier?.permissions).toContain('purchases.payment_sent:write');
    expect(cashier?.permissions).toContain('sales.invoice:read');
    expect(cashier?.permissions).toContain('purchases.invoice:read');
    expect(cashier?.permissions).not.toContain('sales.invoice:write');
    expect(cashier?.permissions).not.toContain('purchases.invoice:write');
    expect(cashier?.permissions).not.toContain('*:*');
  });

  it('buyer is scoped to own suppliers', async () => {
    const { tx, upserted, scopes } = fakeTx();
    await seedSystemRoles(tenantId, tx);
    const buyer = upserted.find((r) => r.name === 'buyer');
    expect(buyer?.permissions).toContain('purchases.supplier:write');
    expect(buyer?.permissions).toContain('purchases.invoice:write');
    expect(buyer?.permissions).not.toContain('sales.invoice:write');
    expect(buyer?.permissions).not.toContain('*:*');
    const buyerScopes = scopes.filter((s) => s.entityId.startsWith('purchases.'));
    expect(buyerScopes).toHaveLength(3);
    expect(buyerScopes.map((s) => s.entityId).sort()).toEqual([
      'purchases.invoice',
      'purchases.payment_sent',
      'purchases.supplier',
    ]);
    for (const s of buyerScopes) {
      expect(s.field).toBe('assignedBuyerId');
      expect(s.operator).toBe('currentUser');
      expect(s.isSystem).toBe(true);
    }
  });

  it('sales is scoped to own customers only', async () => {
    const { tx, upserted } = fakeTx();
    await seedSystemRoles(tenantId, tx);
    const sales = upserted.find((r) => r.name === 'sales');
    expect(sales?.permissions).toContain('sales.customer:read');
    expect(sales?.permissions).toContain('sales.invoice:write');
    expect(sales?.permissions).not.toContain('purchases.invoice:read');
    expect(sales?.permissions).not.toContain('*:*');
  });

  it('warehouse gets stock permissions but no financial write', async () => {
    const { tx, upserted } = fakeTx();
    await seedSystemRoles(tenantId, tx);
    const wh = upserted.find((r) => r.name === 'warehouse');
    expect(wh?.permissions).toContain('inventory.warehouse_stock:write');
    expect(wh?.permissions).not.toContain('sales.invoice:write');
    expect(wh?.permissions).not.toContain('*:*');
  });
});

describe('SYSTEM_ROLE_DEFS', () => {
  describe('chief_accountant', () => {
    it('grants inventory.warehouse_stock:read for stock tab access', () => {
      expect(SYSTEM_ROLE_DEFS.chief_accountant.permissions).toContain(
        'inventory.warehouse_stock:read',
      );
    });

    it('grants inventory.product:read', () => {
      expect(SYSTEM_ROLE_DEFS.chief_accountant.permissions).toContain('inventory.product:read');
    });

    it('grants inventory.warehouse:read', () => {
      expect(SYSTEM_ROLE_DEFS.chief_accountant.permissions).toContain('inventory.warehouse:read');
    });
  });

  describe('warehouse', () => {
    it('does NOT grant sales.invoice:read (stock-only role)', () => {
      expect(SYSTEM_ROLE_DEFS.warehouse.permissions).not.toContain('sales.invoice:read');
    });

    it('does NOT grant purchases.invoice:read (stock-only role)', () => {
      expect(SYSTEM_ROLE_DEFS.warehouse.permissions).not.toContain('purchases.invoice:read');
    });

    it('keeps inventory.warehouse_stock:write for stock movements', () => {
      expect(SYSTEM_ROLE_DEFS.warehouse.permissions).toContain('inventory.warehouse_stock:write');
    });

    it('can write the three stock documents (count / adjustment / transfer)', () => {
      const p = SYSTEM_ROLE_DEFS.warehouse.permissions;
      expect(p).toContain('inventory.inventory_count:write');
      expect(p).toContain('inventory.stock_adjustment:write');
      expect(p).toContain('inventory.stock_transfer:write');
      expect(p).toContain('inventory.inventory_count:post');
    });

    it('does NOT write products or set prices (stock-only)', () => {
      const p = SYSTEM_ROLE_DEFS.warehouse.permissions;
      expect(p).not.toContain('inventory.product:write');
      expect(p).not.toContain('inventory.price_setting:write');
    });
  });
});

describe('SYSTEM_ROLE_DEFS — reports:read', () => {
  it('owner has reports:read', () => {
    expect(SYSTEM_ROLE_DEFS.owner.permissions).toContain('reports:read');
  });
  it('admin has reports:read', () => {
    expect(SYSTEM_ROLE_DEFS.admin.permissions).toContain('reports:read');
  });
  it('viewer does NOT have reports:read', () => {
    expect(SYSTEM_ROLE_DEFS.viewer.permissions).not.toContain('reports:read');
  });
  it('chief_accountant uses report buckets, not the blanket reports:read', () => {
    expect(SYSTEM_ROLE_DEFS.chief_accountant.permissions).not.toContain('reports:read');
  });
  it('bookkeeper uses report buckets, not the blanket reports:read', () => {
    expect(SYSTEM_ROLE_DEFS.bookkeeper.permissions).not.toContain('reports:read');
  });
});

describe('SYSTEM_ROLE_DEFS — report buckets', () => {
  it('warehouse sees inventory reports, no financials', () => {
    expect(SYSTEM_ROLE_DEFS.warehouse.permissions).toContain('reports.inventory:read');
    expect(SYSTEM_ROLE_DEFS.warehouse.permissions).not.toContain('reports.financial:read');
  });
  it('sales sees sales reports + currency read', () => {
    expect(SYSTEM_ROLE_DEFS.sales.permissions).toContain('reports.sales:read');
    expect(SYSTEM_ROLE_DEFS.sales.permissions).toContain('platform.currency:read');
  });
  it('buyer sees purchases + inventory reports', () => {
    expect(SYSTEM_ROLE_DEFS.buyer.permissions).toContain('reports.purchases:read');
    expect(SYSTEM_ROLE_DEFS.buyer.permissions).toContain('reports.inventory:read');
  });
  it('chief_accountant + bookkeeper get financial/sales/purchases reports', () => {
    for (const r of ['chief_accountant', 'bookkeeper'] as const) {
      expect(SYSTEM_ROLE_DEFS[r].permissions).toContain('reports.financial:read');
      expect(SYSTEM_ROLE_DEFS[r].permissions).toContain('reports.sales:read');
      expect(SYSTEM_ROLE_DEFS[r].permissions).toContain('reports.purchases:read');
    }
  });
});
