import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OcrInvoice } from './schemas';

// ──────────────────────────────────────────────────────────────────────────
// Module-level mocks. The DB tx mock keeps a singleton mutable `job` row
// so the test can drive the state transitions (pending → running → done).
// ──────────────────────────────────────────────────────────────────────────

type Job = {
  id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  startedAt: Date | null;
  finishedAt: Date | null;
  output: unknown;
  errorMessage: string | null;
  modelName: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  attachment: { objectKey: string; contentType: string };
};

let job: Job;

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: async <T>(fn: (tx: unknown) => Promise<T>) =>
    fn({
      purchaseInvoiceOcrJob: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          where.id === job.id ? job : null,
        update: async ({ where, data }: { where: { id: string }; data: Partial<Job> }) => {
          if (where.id !== job.id) return null;
          job = { ...job, ...data };
          return job;
        },
      },
    }),
}));

const { runOcrJob, __setAiOverrides } = await import('./run-ocr-job');

function makeJob(): Job {
  return {
    id: 'job-1',
    status: 'pending',
    startedAt: null,
    finishedAt: null,
    output: null,
    errorMessage: null,
    modelName: null,
    inputTokens: null,
    outputTokens: null,
    attachment: { objectKey: 'tenants/t1/ocr/job-1.jpg', contentType: 'image/jpeg' },
  };
}

const VALID_OUTPUT: OcrInvoice = {
  supplierName: 'ООО Ромашка',
  supplierInn: '7707083893',
  invoiceNumber: '№142',
  invoiceDate: '2026-05-13',
  currency: 'RUB',
  totalAmount: 2500,
  lines: [
    {
      rawText: 'Конфеты карамель — 10 × 250 = 2500',
      description: 'Конфеты карамель',
      quantity: 10,
      unit: 'шт',
      unitPrice: 250,
      total: 2500,
      vatRate: 20,
    },
  ],
  confidence: 0.87,
};

describe('runOcrJob', () => {
  beforeEach(() => {
    job = makeJob();
  });

  afterEach(() => {
    __setAiOverrides(null);
  });

  it('transitions pending → running → done on success, persisting output + tokens', async () => {
    __setAiOverrides({
      fetchBytes: async () => new Uint8Array([0xff, 0xd8, 0xff]),
      callModel: async () => ({
        object: VALID_OUTPUT,
        usage: { inputTokens: 1200, outputTokens: 350 },
        modelName: 'anthropic/claude-haiku-4-5',
      }),
    });

    await runOcrJob('job-1');

    expect(job.status).toBe('done');
    expect(job.startedAt).toBeInstanceOf(Date);
    expect(job.finishedAt).toBeInstanceOf(Date);
    expect(job.output).toMatchObject({ supplierName: 'ООО Ромашка', confidence: 0.87 });
    expect(job.modelName).toBe('anthropic/claude-haiku-4-5');
    expect(job.inputTokens).toBe(1200);
    expect(job.outputTokens).toBe(350);
    expect(job.errorMessage).toBeNull();
  });

  it('persists errorMessage + failed status when the AI client throws', async () => {
    __setAiOverrides({
      fetchBytes: async () => new Uint8Array([1, 2, 3]),
      callModel: async () => {
        throw new Error('gateway returned 500');
      },
    });

    await runOcrJob('job-1');

    expect(job.status).toBe('failed');
    expect(job.errorMessage).toContain('gateway returned 500');
    expect(job.output).toBeNull();
  });

  it('persists failed status when the model output fails schema validation', async () => {
    __setAiOverrides({
      fetchBytes: async () => new Uint8Array([1, 2, 3]),
      // Force a shape that violates the schema: missing required arrays.
      callModel: async () =>
        ({
          object: { supplierName: 'X', lines: 'not-an-array' },
          modelName: 'anthropic/claude-haiku-4-5',
        }) as unknown as { object: OcrInvoice; modelName: string },
    });

    await runOcrJob('job-1');

    expect(job.status).toBe('failed');
    expect(job.errorMessage).toMatch(/schema/i);
  });

  it('is a no-op on jobs not in pending state (idempotent)', async () => {
    job.status = 'done';
    job.output = VALID_OUTPUT;

    __setAiOverrides({
      fetchBytes: async () => {
        throw new Error('should not be called');
      },
      callModel: async () => {
        throw new Error('should not be called');
      },
    });

    await expect(runOcrJob('job-1')).resolves.toBeUndefined();
    expect(job.status).toBe('done');
  });

  it('silently returns when the job id is unknown', async () => {
    await expect(runOcrJob('missing-job')).resolves.toBeUndefined();
  });
});
