import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockResolveContext = vi.hoisted(() => vi.fn());
const userUpdate = vi.hoisted(() => vi.fn());

vi.mock('@/platform/auth/current-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/platform/auth/current-context')>();
  return {
    ...actual,
    resolveContext: mockResolveContext,
  };
});

// Stub the DB layer entirely — `withBypass` runs the callback against a fake
// transaction client so the test never touches the shared dev database.
vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: vi.fn(async (fn: (tx: { user: { update: typeof userUpdate } }) => unknown) =>
    fn({ user: { update: userUpdate } }),
  ),
}));

import { completeProfileAction } from './actions';

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const USER_ID = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
  mockResolveContext.mockReset();
  userUpdate.mockReset();
});

describe('completeProfileAction', () => {
  it('saves firstName, lastName, phone on the current user', async () => {
    mockResolveContext.mockResolvedValue({ user: { id: USER_ID } });
    userUpdate.mockResolvedValue({ id: USER_ID });

    const res = await completeProfileAction(
      form({ firstName: 'Ivan', lastName: 'Petrov', phone: '+79991234567' }),
    );

    expect(res).toEqual({ ok: true });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { firstName: 'Ivan', lastName: 'Petrov', phone: '+79991234567' },
    });
  });

  it('rejects an empty phone', async () => {
    mockResolveContext.mockResolvedValue({ user: { id: USER_ID } });

    const res = await completeProfileAction(form({ firstName: 'A', lastName: 'B', phone: '' }));

    expect(res).toEqual({ ok: false, error: 'invalid_phone' });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('returns unauthorized when there is no auth context', async () => {
    mockResolveContext.mockResolvedValue(null);

    const res = await completeProfileAction(
      form({ firstName: 'A', lastName: 'B', phone: '+79991234567' }),
    );

    expect(res).toEqual({ ok: false, error: 'unauthorized' });
    expect(userUpdate).not.toHaveBeenCalled();
  });
});
