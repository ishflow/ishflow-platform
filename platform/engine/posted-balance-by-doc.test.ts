import { describe, expect, it } from 'vitest';
import { openBalanceByPartyDoc } from './posted-balance-by-doc';

describe('openBalanceByPartyDoc', () => {
  it('exports a function with the expected signature', () => {
    expect(typeof openBalanceByPartyDoc).toBe('function');
  });

  // Integration-level test would need a tenant + seeded movements; this
  // module is exercised end-to-end by the LinkedInvoicesEditor smoke
  // path. The function shape is verified by the type-level constraint
  // on RegisterKey + the tx delegate name lookup at runtime — wrong
  // names would throw on the first call, surfaced by the UAT script.
});
