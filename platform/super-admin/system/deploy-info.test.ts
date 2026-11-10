import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDeployInfo } from './deploy-info';

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  const next = { ...ORIG_ENV };
  // biome-ignore lint/performance/noDelete: env var unset must remove the key for `in` checks
  delete next.VERCEL_DEPLOYMENT_ID;
  // biome-ignore lint/performance/noDelete: env var unset must remove the key for `in` checks
  delete next.VERCEL_API_TOKEN;
  // biome-ignore lint/performance/noDelete: env var unset must remove the key for `in` checks
  delete next.VERCEL_TEAM_ID;
  // biome-ignore lint/performance/noDelete: env var unset must remove the key for `in` checks
  delete next.VERCEL_GIT_COMMIT_SHA;
  // biome-ignore lint/performance/noDelete: env var unset must remove the key for `in` checks
  delete next.VERCEL_URL;
  process.env = next;
});

afterEach(() => {
  process.env = ORIG_ENV;
});

describe('getDeployInfo', () => {
  it('reports unavailable when VERCEL_DEPLOYMENT_ID is missing', async () => {
    const info = await getDeployInfo(vi.fn() as never);
    expect(info.available).toBe(false);
    expect(info.reason).toMatch(/VERCEL_DEPLOYMENT_ID/);
  });

  it('returns env-derived fallback when token missing but deployment ID present', async () => {
    process.env.VERCEL_DEPLOYMENT_ID = 'dpl_abc';
    process.env.VERCEL_URL = 'preview.example.com';
    process.env.VERCEL_GIT_COMMIT_SHA = 'deadbeef';
    const info = await getDeployInfo(vi.fn() as never);
    expect(info.available).toBe(true);
    expect(info.deploymentId).toBe('dpl_abc');
    expect(info.url).toBe('preview.example.com');
    expect(info.gitSha).toBe('deadbeef');
    expect(info.reason).toMatch(/VERCEL_API_TOKEN not set/);
  });

  it('hydrates from Vercel API when token + deployment ID present', async () => {
    process.env.VERCEL_DEPLOYMENT_ID = 'dpl_abc';
    process.env.VERCEL_API_TOKEN = 'tok_xyz';
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: 'dpl_abc',
        url: 'foo.vercel.app',
        readyState: 'READY',
        createdAt: 1_700_000_000_000,
        gitSource: { sha: 'cafebabe' },
      }),
    }));
    const info = await getDeployInfo(fetchImpl as never);
    expect(info.available).toBe(true);
    expect(info.url).toBe('https://foo.vercel.app');
    expect(info.state).toBe('READY');
    expect(info.gitSha).toBe('cafebabe');
  });

  it('surfaces a friendly reason on API error', async () => {
    process.env.VERCEL_DEPLOYMENT_ID = 'dpl_abc';
    process.env.VERCEL_API_TOKEN = 'tok_xyz';
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) }));
    const info = await getDeployInfo(fetchImpl as never);
    expect(info.available).toBe(false);
    expect(info.reason).toMatch(/403/);
  });
});
