import { anthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';

/**
 * Thrown by `getModel()` when neither `AI_GATEWAY_API_KEY` nor
 * `ANTHROPIC_API_KEY` is configured. The run-job flow catches this and
 * persists a friendly errorMessage on the OcrJob row.
 */
export class AddonUnconfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AddonUnconfiguredError';
  }
}

export const OCR_MODEL_GATEWAY_ID = 'anthropic/claude-haiku-4-5';
export const OCR_MODEL_DIRECT_ID = 'claude-haiku-4-5';

/**
 * Returns a vision-capable model identifier suitable for `generateObject`.
 *
 * Priority:
 *   1. AI_GATEWAY_API_KEY set → return the gateway string id; `ai` SDK
 *      auto-routes through the Vercel AI Gateway.
 *   2. ANTHROPIC_API_KEY set → return the direct Anthropic provider model
 *      (offline-from-gateway dev fallback).
 *   3. Neither set → throw AddonUnconfiguredError.
 */
export function getModel(): LanguageModel {
  if (process.env.AI_GATEWAY_API_KEY) {
    // The gateway accepts the bare provider/model string; the `ai` package
    // resolves it via the gateway when AI_GATEWAY_API_KEY is in env.
    return OCR_MODEL_GATEWAY_ID as unknown as LanguageModel;
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic(OCR_MODEL_DIRECT_ID);
  }
  throw new AddonUnconfiguredError(
    'AI_GATEWAY_API_KEY or ANTHROPIC_API_KEY is not configured. Contact your operator to enable AI OCR.',
  );
}

/**
 * Resolves the model identifier as a stable string for logging/audit.
 * Useful when we store `model_name` on the OcrJob row.
 */
export function getModelName(): string {
  if (process.env.AI_GATEWAY_API_KEY) return OCR_MODEL_GATEWAY_ID;
  return OCR_MODEL_DIRECT_ID;
}
