import { describe, expect, it, vi } from 'vitest';
import { UnsafeDbRoleError, assertRuntimeRoleSafe, verifyRuntimeRoleSafe } from './role-guard';

type MockClient = { $queryRaw: ReturnType<typeof vi.fn> };

function makeClient(rows: Array<{ rolsuper: boolean; rolbypassrls: boolean }>): MockClient {
  return { $queryRaw: vi.fn().mockResolvedValue(rows) };
}

const noSleep = () => Promise.resolve();

describe('assertRuntimeRoleSafe', () => {
  it('resolves when role has neither superuser nor bypassrls', async () => {
    const client = makeClient([{ rolsuper: false, rolbypassrls: false }]);
    await expect(assertRuntimeRoleSafe(client as never)).resolves.toBeUndefined();
  });

  it('throws UnsafeDbRoleError when role has rolbypassrls = true', async () => {
    const client = makeClient([{ rolsuper: false, rolbypassrls: true }]);
    await expect(assertRuntimeRoleSafe(client as never)).rejects.toThrow(UnsafeDbRoleError);
    await expect(assertRuntimeRoleSafe(client as never)).rejects.toThrow(/bypassrls/i);
  });

  it('throws UnsafeDbRoleError when role has rolsuper = true', async () => {
    const client = makeClient([{ rolsuper: true, rolbypassrls: false }]);
    await expect(assertRuntimeRoleSafe(client as never)).rejects.toThrow(UnsafeDbRoleError);
    await expect(assertRuntimeRoleSafe(client as never)).rejects.toThrow(/superuser|rolsuper/i);
  });

  it('throws UnsafeDbRoleError when pg_roles lookup returns no rows', async () => {
    const client = makeClient([]);
    await expect(assertRuntimeRoleSafe(client as never)).rejects.toThrow(UnsafeDbRoleError);
    await expect(assertRuntimeRoleSafe(client as never)).rejects.toThrow(/pg_roles/i);
  });

  it('throws UnsafeDbRoleError when both rolsuper and rolbypassrls are true', async () => {
    const client = makeClient([{ rolsuper: true, rolbypassrls: true }]);
    await expect(assertRuntimeRoleSafe(client as never)).rejects.toThrow(UnsafeDbRoleError);
  });

  it('propagates a transient query error unchanged (NOT UnsafeDbRoleError)', async () => {
    const poolTimeout = new Error('Timed out fetching a new connection from the connection pool');
    const client = { $queryRaw: vi.fn().mockRejectedValue(poolTimeout) };
    await expect(assertRuntimeRoleSafe(client as never)).rejects.toBe(poolTimeout);
  });
});

describe('verifyRuntimeRoleSafe', () => {
  it('resolves on a safe role without invoking onUnsafe/onUnverified', async () => {
    const client = makeClient([{ rolsuper: false, rolbypassrls: false }]);
    const onUnsafe = vi.fn();
    const onUnverified = vi.fn();
    await expect(
      verifyRuntimeRoleSafe(client as never, { onUnsafe, onUnverified, sleep: noSleep }),
    ).resolves.toBeUndefined();
    expect(onUnsafe).not.toHaveBeenCalled();
    expect(onUnverified).not.toHaveBeenCalled();
    expect(client.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('calls onUnsafe and rejects on a verified unsafe role — without retrying', async () => {
    const client = makeClient([{ rolsuper: false, rolbypassrls: true }]);
    const onUnsafe = vi.fn();
    const onUnverified = vi.fn();
    await expect(
      verifyRuntimeRoleSafe(client as never, { onUnsafe, onUnverified, sleep: noSleep }),
    ).rejects.toThrow(UnsafeDbRoleError);
    expect(onUnsafe).toHaveBeenCalledTimes(1);
    expect(onUnsafe.mock.calls[0]?.[0]).toBeInstanceOf(UnsafeDbRoleError);
    expect(onUnverified).not.toHaveBeenCalled();
    expect(client.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('retries a transient error then resolves via onUnverified (never onUnsafe)', async () => {
    const poolTimeout = new Error('Timed out fetching a new connection from the connection pool');
    const client = { $queryRaw: vi.fn().mockRejectedValue(poolTimeout) };
    const onUnsafe = vi.fn();
    const onUnverified = vi.fn();
    await expect(
      verifyRuntimeRoleSafe(client as never, {
        onUnsafe,
        onUnverified,
        attempts: 3,
        sleep: noSleep,
      }),
    ).resolves.toBeUndefined();
    expect(client.$queryRaw).toHaveBeenCalledTimes(3);
    expect(onUnsafe).not.toHaveBeenCalled();
    expect(onUnverified).toHaveBeenCalledTimes(1);
    expect(onUnverified.mock.calls[0]?.[0]).toBe(poolTimeout);
  });

  it('recovers when a transient error is followed by success', async () => {
    const client = {
      $queryRaw: vi
        .fn()
        .mockRejectedValueOnce(new Error('pool timeout'))
        .mockResolvedValueOnce([{ rolsuper: false, rolbypassrls: false }]),
    };
    const onUnsafe = vi.fn();
    const onUnverified = vi.fn();
    await expect(
      verifyRuntimeRoleSafe(client as never, { onUnsafe, onUnverified, sleep: noSleep }),
    ).resolves.toBeUndefined();
    expect(client.$queryRaw).toHaveBeenCalledTimes(2);
    expect(onUnsafe).not.toHaveBeenCalled();
    expect(onUnverified).not.toHaveBeenCalled();
  });
});
