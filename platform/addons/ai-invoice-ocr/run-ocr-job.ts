import { withBypass } from '@/platform/db/tenant-context';
import { generateObject } from 'ai';
import { AddonUnconfiguredError, getModel, getModelName } from './ai-client';
import { OCR_SYSTEM_PROMPT, OCR_USER_PROMPT } from './prompts';
import { type OcrInvoice, ocrInvoiceSchema } from './schemas';
import { getOcrObject } from './storage';

/**
 * Optional dependency-injection for tests. Both fns default to the real
 * implementations; tests overlay `__setAiOverrides({...})` to inject
 * deterministic stubs without hitting R2 or the AI gateway.
 */
type AiOverrides = {
  fetchBytes: (objectKey: string) => Promise<Uint8Array>;
  callModel: (input: {
    bytes: Uint8Array;
    contentType: string;
  }) => Promise<{
    object: OcrInvoice;
    usage?: { inputTokens?: number; outputTokens?: number };
    modelName: string;
  }>;
};

let overrides: Partial<AiOverrides> | null = null;

export function __setAiOverrides(o: Partial<AiOverrides> | null): void {
  overrides = o;
}

async function defaultCallModel(input: {
  bytes: Uint8Array;
  contentType: string;
}): Promise<{
  object: OcrInvoice;
  usage?: { inputTokens?: number; outputTokens?: number };
  modelName: string;
}> {
  const model = getModel();
  const result = await generateObject({
    model,
    schema: ocrInvoiceSchema,
    schemaName: 'SupplierInvoice',
    schemaDescription: 'Structured data extracted from a supplier invoice photograph or PDF.',
    messages: [
      { role: 'system', content: OCR_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: OCR_USER_PROMPT },
          input.contentType === 'application/pdf'
            ? {
                type: 'file' as const,
                data: input.bytes,
                mediaType: 'application/pdf',
              }
            : {
                type: 'image' as const,
                image: input.bytes,
                mediaType: input.contentType,
              },
        ],
      },
    ],
  });
  return {
    object: result.object,
    usage: {
      inputTokens: (result.usage as { inputTokens?: number } | undefined)?.inputTokens ?? undefined,
      outputTokens:
        (result.usage as { outputTokens?: number } | undefined)?.outputTokens ?? undefined,
    },
    modelName: getModelName(),
  };
}

/**
 * Run a pending OCR job to completion. Reads the source bytes, calls the
 * vision model, validates the output, and updates the DB row. Never
 * throws — every failure path persists `errorMessage` and flips status
 * to `failed` so the polling client sees a clean state.
 *
 * Designed to be invoked from `after(() => runOcrJob(jobId))` after the
 * server action returns. Idempotent: re-entering on a `done` or `failed`
 * row is a no-op.
 */
export async function runOcrJob(jobId: string): Promise<void> {
  const job = await withBypass((tx) =>
    tx.purchaseInvoiceOcrJob.findUnique({
      where: { id: jobId },
      include: { attachment: true },
    }),
  );
  if (!job) return;
  if (job.status !== 'pending') return;

  await withBypass((tx) =>
    tx.purchaseInvoiceOcrJob.update({
      where: { id: jobId },
      data: { status: 'running', startedAt: new Date() },
    }),
  );

  try {
    const fetchBytes = overrides?.fetchBytes ?? getOcrObject;
    const callModel = overrides?.callModel ?? defaultCallModel;

    const bytes = await fetchBytes(job.attachment.objectKey);
    const { object, usage, modelName } = await callModel({
      bytes,
      contentType: job.attachment.contentType,
    });

    // Re-validate via zod — defends against models that ignore the schema.
    const parsed = ocrInvoiceSchema.safeParse(object);
    if (!parsed.success) {
      throw new Error(`Model output failed schema validation: ${parsed.error.message}`);
    }

    await withBypass((tx) =>
      tx.purchaseInvoiceOcrJob.update({
        where: { id: jobId },
        data: {
          status: 'done',
          finishedAt: new Date(),
          output: parsed.data,
          modelName,
          inputTokens: usage?.inputTokens ?? null,
          outputTokens: usage?.outputTokens ?? null,
          errorMessage: null,
        },
      }),
    );
  } catch (err) {
    const message =
      err instanceof AddonUnconfiguredError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Unknown OCR failure';
    await withBypass((tx) =>
      tx.purchaseInvoiceOcrJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          errorMessage: message.slice(0, 500),
        },
      }),
    );
  }
}
