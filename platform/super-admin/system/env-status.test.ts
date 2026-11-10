import { describe, expect, it } from 'vitest';
import { getEnvVarStatus } from './env-status';

describe('getEnvVarStatus', () => {
  it('reports configured for non-empty values', () => {
    const env = {
      CLERK_SECRET_KEY: 'sk_test_xyz',
      STRIPE_SECRET_KEY: 'sk_live_xyz',
    } as unknown as NodeJS.ProcessEnv;
    const groups = getEnvVarStatus(env);
    const clerk = groups.find((g) => g.group === 'Clerk');
    expect(clerk).toBeDefined();
    const secret = clerk?.items.find((i) => i.key === 'CLERK_SECRET_KEY');
    expect(secret?.configured).toBe(true);
  });

  it('reports missing for absent keys', () => {
    const env = {} as unknown as NodeJS.ProcessEnv;
    const groups = getEnvVarStatus(env);
    const stripe = groups.find((g) => g.group === 'Stripe');
    const all = stripe?.items.every((i) => i.configured === false);
    expect(all).toBe(true);
  });

  it('reports missing for whitespace-only values', () => {
    const env = { CLERK_SECRET_KEY: '   ' } as unknown as NodeJS.ProcessEnv;
    const groups = getEnvVarStatus(env);
    const clerk = groups.find((g) => g.group === 'Clerk');
    const secret = clerk?.items.find((i) => i.key === 'CLERK_SECRET_KEY');
    expect(secret?.configured).toBe(false);
  });

  it('never returns env var values', () => {
    const env = { CLERK_SECRET_KEY: 'sk_test_xyz' } as unknown as NodeJS.ProcessEnv;
    const groups = getEnvVarStatus(env);
    const serialized = JSON.stringify(groups);
    expect(serialized).not.toContain('sk_test_xyz');
  });
});
