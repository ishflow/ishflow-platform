import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreate = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());

vi.mock('@/platform/db', () => ({
  prisma: { cronRun: { create: mockCreate, update: mockUpdate } },
}));

const { recordCronRun } = await import('./record-cron-run');

describe('recordCronRun', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockCreate.mockResolvedValue({ id: 'run-1' });
    mockUpdate.mockResolvedValue({});
  });

  it('records a running row then flips to success with a JSON summary', async () => {
    const result = await recordCronRun('trial-expiry', async () => ({ processed: 3 }));

    expect(result).toEqual({ processed: 3 });
    expect(mockCreate).toHaveBeenCalledWith({
      data: { jobName: 'trial-expiry', status: 'running' },
      select: { id: true },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: { status: 'success', finishedAt: expect.any(Date), output: '{"processed":3}' },
    });
  });

  it('records error + message and re-throws when the job throws', async () => {
    await expect(
      recordCronRun('fx-rates', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: { status: 'error', finishedAt: expect.any(Date), errorMessage: 'boom' },
    });
  });

  it('never blocks the job when the telemetry insert fails', async () => {
    mockCreate.mockRejectedValueOnce(new Error('db down'));

    const result = await recordCronRun('low-stock-check', async () => ({ emails: 5 }));

    expect(result).toEqual({ emails: 5 });
    // No run id was captured, so no update is attempted.
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('swallows a telemetry update failure without affecting the result', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('update failed'));

    const result = await recordCronRun('idempotency-cleanup', async () => ({ purged: 9 }));

    expect(result).toEqual({ purged: 9 });
  });
});
