import { describe, expect, it } from 'vitest';
import { compareVersions, evaluateForceUpdate } from './force-update';
import type { MinVersionState } from './min-versions';

const NO_MIN: MinVersionState = { ios: null, android: null };

describe('compareVersions', () => {
  it('orders numerically, not lexicographically (1.9.0 < 1.10.0)', () => {
    expect(compareVersions('1.9.0', '1.10.0')).toBe(-1);
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
  });

  it('treats equal versions as 0', () => {
    expect(compareVersions('1.6.0', '1.6.0')).toBe(0);
  });

  it('treats missing trailing segments as 0 (1.6 === 1.6.0)', () => {
    expect(compareVersions('1.6', '1.6.0')).toBe(0);
    expect(compareVersions('1.6.0', '1.6')).toBe(0);
  });

  it('compares major/minor/patch left to right', () => {
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1);
    expect(compareVersions('1.5.9', '1.6.0')).toBe(-1);
  });

  it('tolerates a leading v and whitespace', () => {
    expect(compareVersions(' v1.6.0 ', '1.6.0')).toBe(0);
  });

  it('returns 0 (equal) for garbage on either side — fail safe', () => {
    expect(compareVersions('1.x.0', '1.6.0')).toBe(0);
    expect(compareVersions('1.6.0', 'latest')).toBe(0);
    expect(compareVersions('', '1.6.0')).toBe(0);
  });
});

describe('evaluateForceUpdate', () => {
  const min: MinVersionState = { ios: '1.6.0', android: '1.5.0' };

  it('requires update when client is below the platform minimum', () => {
    const r = evaluateForceUpdate({ platform: 'ios', clientVersion: '1.5.0', min });
    expect(r).toEqual({ required: true, minVersion: '1.6.0', platform: 'ios' });
  });

  it('does not require update when client equals the minimum', () => {
    const r = evaluateForceUpdate({ platform: 'ios', clientVersion: '1.6.0', min });
    expect(r).toEqual({ required: false, minVersion: '1.6.0', platform: 'ios' });
  });

  it('does not require update when client is above the minimum', () => {
    const r = evaluateForceUpdate({ platform: 'android', clientVersion: '1.7.2', min });
    expect(r).toEqual({ required: false, minVersion: '1.5.0', platform: 'android' });
  });

  it('uses numeric ordering: 1.9.0 is below 1.10.0', () => {
    const r = evaluateForceUpdate({
      platform: 'ios',
      clientVersion: '1.9.0',
      min: { ios: '1.10.0', android: null },
    });
    expect(r.required).toBe(true);
    expect(r.minVersion).toBe('1.10.0');
  });

  it('fails open when the client version header is missing (null)', () => {
    const r = evaluateForceUpdate({ platform: 'ios', clientVersion: null, min });
    expect(r).toEqual({ required: false, minVersion: '1.6.0', platform: 'ios' });
  });

  it('fails open when no minimum is configured for the platform', () => {
    const r = evaluateForceUpdate({ platform: 'ios', clientVersion: '0.1.0', min: NO_MIN });
    expect(r).toEqual({ required: false, minVersion: null, platform: 'ios' });
  });

  it('fails open when the platform is unknown/null', () => {
    const r = evaluateForceUpdate({ platform: null, clientVersion: '0.1.0', min });
    expect(r).toEqual({ required: false, minVersion: null, platform: null });
  });

  it('fails open when the client version is garbage/unparseable', () => {
    const r = evaluateForceUpdate({ platform: 'ios', clientVersion: 'totally-broken', min });
    expect(r).toEqual({ required: false, minVersion: '1.6.0', platform: 'ios' });
  });

  it('fails open when the configured minimum itself is garbage', () => {
    const r = evaluateForceUpdate({
      platform: 'ios',
      clientVersion: '1.0.0',
      min: { ios: 'not-a-version', android: null },
    });
    expect(r.required).toBe(false);
  });
});
