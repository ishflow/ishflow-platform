/**
 * Lightweight tests for confirm-row error surfaces. The full happy-path
 * confirmation flow (invoice + payment doc + posting) is database-bound and
 * lives behind `HAS_DB`. Here we cover the cheap invariants that don't need a
 * live DB.
 */

import type { AppContext } from '@/platform/auth/current-context';
import { describe, expect, it } from 'vitest';
import { AddonDisabledError } from '../assert-addon';
import {
  BankRowAlreadyResolvedError,
  BankRowNotFoundError,
  MissingMatchError,
  confirmManualMatch,
  confirmMatch,
  ignoreRow,
} from './confirm-row';

function buildCtx(addonEnabled: boolean, tenant = true): AppContext {
  return {
    user: { id: '00000000-0000-0000-0000-000000000001' } as never,
    tenant: tenant ? ({ id: '00000000-0000-0000-0000-000000000002' } as never) : null,
    membership: null,
    permissions: new Set(),
    scopesByEntity: new Map(),
    addons: new Set(addonEnabled ? (['bank_integration'] as const) : []),
  };
}

describe('confirm-row addon gate', () => {
  it('confirmMatch throws AddonDisabledError when addon disabled', async () => {
    await expect(confirmMatch(buildCtx(false), { rowId: 'row-x' })).rejects.toBeInstanceOf(
      AddonDisabledError,
    );
  });

  it('confirmManualMatch throws AddonDisabledError when addon disabled', async () => {
    await expect(
      confirmManualMatch(buildCtx(false), {
        rowId: 'row-x',
        docId: 'doc-x',
        docType: 'sales.invoice',
      }),
    ).rejects.toBeInstanceOf(AddonDisabledError);
  });

  it('ignoreRow throws AddonDisabledError when addon disabled', async () => {
    await expect(ignoreRow(buildCtx(false), { rowId: 'row-x' })).rejects.toBeInstanceOf(
      AddonDisabledError,
    );
  });
});

describe('confirm-row error class exports', () => {
  it('exports the three custom errors with stable name + message', () => {
    expect(new BankRowNotFoundError('r1').name).toBe('BankRowNotFoundError');
    expect(new BankRowNotFoundError('r1').message).toContain('r1');
    expect(new BankRowAlreadyResolvedError('r1', 'confirmed').name).toBe(
      'BankRowAlreadyResolvedError',
    );
    expect(new BankRowAlreadyResolvedError('r1', 'confirmed').message).toContain('confirmed');
    expect(new MissingMatchError('r1').name).toBe('MissingMatchError');
    expect(new MissingMatchError('r1').message).toContain('r1');
  });
});
