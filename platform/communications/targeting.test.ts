import { describe, expect, it } from 'vitest';
import { type ViewerTarget, matchesTargeting, parseTargeting } from './targeting';

function makeViewer(overrides: Partial<ViewerTarget> = {}): ViewerTarget {
  return {
    plan: 'pro',
    addons: new Set(['ai_invoice_ocr']),
    roles: ['owner'],
    locale: 'ru',
    tenantId: '00000000-0000-0000-0000-000000000001',
    ...overrides,
  };
}

describe('parseTargeting', () => {
  it('returns {} for null/undefined/non-object', () => {
    expect(parseTargeting(null)).toEqual({});
    expect(parseTargeting(undefined)).toEqual({});
    expect(parseTargeting('not-json')).toEqual({});
    expect(parseTargeting(42)).toEqual({});
    expect(parseTargeting([1, 2])).toEqual({});
  });

  it('keeps only string entries within each axis', () => {
    const parsed = parseTargeting({ plans: ['pro', 7, null, 'business'], roles: ['owner'] });
    expect(parsed.plans).toEqual(['pro', 'business']);
    expect(parsed.roles).toEqual(['owner']);
  });

  it('ignores non-array axes', () => {
    const parsed = parseTargeting({ plans: 'pro', locales: { ru: true } });
    expect(parsed.plans).toBeUndefined();
    expect(parsed.locales).toBeUndefined();
  });
});

describe('matchesTargeting', () => {
  it('returns true when targeting is fully empty', () => {
    expect(matchesTargeting({}, makeViewer())).toBe(true);
  });

  it('plan axis: matches when plan is in the list', () => {
    expect(matchesTargeting({ plans: ['pro', 'business'] }, makeViewer({ plan: 'pro' }))).toBe(
      true,
    );
    expect(matchesTargeting({ plans: ['business'] }, makeViewer({ plan: 'pro' }))).toBe(false);
  });

  it('addon axis: matches when viewer has at least one matching addon', () => {
    expect(matchesTargeting({ addons: ['ai_invoice_ocr'] }, makeViewer())).toBe(true);
    expect(matchesTargeting({ addons: ['kkt_54fz'] }, makeViewer())).toBe(false);
  });

  it('role axis: matches when viewer holds at least one matching role', () => {
    expect(matchesTargeting({ roles: ['owner', 'admin'] }, makeViewer({ roles: ['owner'] }))).toBe(
      true,
    );
    expect(matchesTargeting({ roles: ['admin'] }, makeViewer({ roles: ['sales'] }))).toBe(false);
  });

  it('locale axis: matches tenant default locale', () => {
    expect(matchesTargeting({ locales: ['ru', 'en'] }, makeViewer({ locale: 'ru' }))).toBe(true);
    expect(matchesTargeting({ locales: ['tr'] }, makeViewer({ locale: 'ru' }))).toBe(false);
  });

  it('tenantId axis: matches literal tenant id', () => {
    const id = '00000000-0000-0000-0000-000000000001';
    expect(matchesTargeting({ tenantIds: [id] }, makeViewer({ tenantId: id }))).toBe(true);
    expect(matchesTargeting({ tenantIds: ['other'] }, makeViewer({ tenantId: id }))).toBe(false);
    expect(matchesTargeting({ tenantIds: [id] }, makeViewer({ tenantId: null }))).toBe(false);
  });

  it('AND across axes — fails when any non-empty axis misses', () => {
    const viewer = makeViewer({ plan: 'pro', roles: ['owner'] });
    expect(matchesTargeting({ plans: ['pro'], roles: ['admin'] }, viewer)).toBe(false);
    expect(matchesTargeting({ plans: ['pro'], roles: ['owner'] }, viewer)).toBe(true);
  });

  it('empty list on an axis is "no filter"', () => {
    expect(matchesTargeting({ plans: [], roles: ['owner'] }, makeViewer())).toBe(true);
  });
});
