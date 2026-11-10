import { describe, expect, it } from 'vitest';
import './bank-account';
import { getRegistry } from '@/platform/metadata';

describe('treasury.bank_account catalog', () => {
  it('is registered as a catalog', () => {
    expect(getRegistry().catalog['treasury.bank_account']).toBeDefined();
  });

  it('declares required name + accountNo fields', () => {
    const cfg = getRegistry().catalog['treasury.bank_account'];
    expect(cfg?.fields.name?.required).toBe(true);
    expect(cfg?.fields.accountNo?.required).toBe(true);
  });
});
