import { describe, expect, it } from 'vitest';
import { pickPrimaryRoleName } from './pick-primary-role';

describe('pickPrimaryRoleName', () => {
  it('returns viewer when membership has no roles', () => {
    expect(pickPrimaryRoleName([])).toBe('viewer');
  });

  it('picks owner over admin when both present', () => {
    expect(pickPrimaryRoleName([{ name: 'admin' }, { name: 'owner' }])).toBe('owner');
  });

  it('picks chief_accountant over bookkeeper', () => {
    expect(pickPrimaryRoleName([{ name: 'bookkeeper' }, { name: 'chief_accountant' }])).toBe(
      'chief_accountant',
    );
  });

  it('picks bookkeeper over cashier', () => {
    expect(pickPrimaryRoleName([{ name: 'cashier' }, { name: 'bookkeeper' }])).toBe('bookkeeper');
  });

  it('picks cashier over buyer', () => {
    expect(pickPrimaryRoleName([{ name: 'buyer' }, { name: 'cashier' }])).toBe('cashier');
  });

  it('picks buyer over sales', () => {
    expect(pickPrimaryRoleName([{ name: 'sales' }, { name: 'buyer' }])).toBe('buyer');
  });

  it('picks sales over warehouse', () => {
    expect(pickPrimaryRoleName([{ name: 'warehouse' }, { name: 'sales' }])).toBe('sales');
  });

  it('picks warehouse over viewer', () => {
    expect(pickPrimaryRoleName([{ name: 'viewer' }, { name: 'warehouse' }])).toBe('warehouse');
  });

  it('treats unknown custom roles as lowest priority', () => {
    expect(pickPrimaryRoleName([{ name: 'depocu_custom' }, { name: 'viewer' }])).toBe('viewer');
  });

  it('returns custom role name when it is the only role', () => {
    expect(pickPrimaryRoleName([{ name: 'depocu_custom' }])).toBe('depocu_custom');
  });
});
