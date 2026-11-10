import { describe, expect, it } from 'vitest';
import './bank-funds';
import { getRegistry } from '@/platform/metadata';

describe('treasury.bank_funds register', () => {
  it('is registered as an accumulation register', () => {
    expect(getRegistry().register['treasury.bank_funds']).toBeDefined();
  });

  it('has a required bankAccount reference dimension', () => {
    const cfg = getRegistry().register['treasury.bank_funds'];
    expect(cfg?.dimensions.bankAccount).toBeDefined();
    expect(cfg?.dimensions.bankAccount?.type).toBe('reference');
    expect(cfg?.dimensions.bankAccount?.required).toBe(true);
  });

  it('exposes an `amount` money resource', () => {
    const cfg = getRegistry().register['treasury.bank_funds'];
    expect(cfg?.resources.amount).toBeDefined();
    expect(cfg?.resources.amount?.type).toBe('money');
  });
});
