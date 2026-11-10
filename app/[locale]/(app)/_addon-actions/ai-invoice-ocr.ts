'use server';

import {
  InvalidOcrFileError,
  type OcrJobView,
  pollOcrJob as pollOcrJobImpl,
  runOcrJob,
  startOcrJob as startOcrJobImpl,
} from '@/platform/addons/ai-invoice-ocr';
import { AddonDisabledError } from '@/platform/addons/assert-addon';
import { requireTenantContext } from '@/platform/auth/current-context';
import { after } from 'next/server';

export type StartOcrActionResult =
  | { ok: true; jobId: string }
  | {
      ok: false;
      code: 'addon_disabled' | 'invalid_file_type' | 'file_too_large' | 'empty_file' | 'no_file';
      message: string;
    };

/**
 * Server action invoked from the scan dialog. Receives the uploaded
 * blob via `FormData`, hands off to `startOcrJob`, and kicks off the
 * background run via `unstable_after`. The dialog polls `pollOcrJob`
 * to track progress.
 *
 * Errors are returned as typed result codes (not thrown) so the
 * client form can render localized messages without parsing exception
 * strings.
 */
export async function startOcrJob(formData: FormData): Promise<StartOcrActionResult> {
  const ctx = await requireTenantContext();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return {
      ok: false,
      code: 'no_file',
      message: 'No file was provided in the upload form.',
    };
  }

  let bytes: Uint8Array;
  try {
    const buf = await file.arrayBuffer();
    bytes = new Uint8Array(buf);
  } catch {
    return {
      ok: false,
      code: 'empty_file',
      message: 'Failed to read the uploaded file.',
    };
  }

  try {
    const { jobId } = await startOcrJobImpl(ctx, {
      bytes,
      filename: file.name || 'upload.bin',
      contentType: file.type || 'application/octet-stream',
    });

    // Schedule the AI extraction to run AFTER the action returns. The
    // client immediately starts polling for status updates.
    after(async () => {
      try {
        await runOcrJob(jobId);
      } catch (err) {
        // runOcrJob already persists errorMessage on failure paths;
        // this catch is purely a guard against unhandled promise
        // rejections crashing the runtime.
        process.stderr.write(
          `runOcrJob crashed: ${err instanceof Error ? err.message : String(err)}\n`,
        );
      }
    });

    return { ok: true, jobId };
  } catch (err) {
    if (err instanceof AddonDisabledError) {
      return {
        ok: false,
        code: 'addon_disabled',
        message: 'The AI invoice OCR add-on is not enabled for this workspace.',
      };
    }
    if (err instanceof InvalidOcrFileError) {
      return { ok: false, code: err.code, message: err.message };
    }
    throw err;
  }
}

/**
 * Server action that returns the current OCR job state. Called by the
 * client every 1.5 s while a job is in `pending` / `running`. Returns
 * `null` when the job is not found or the tenant has no access.
 */
export async function pollOcrJob(jobId: string): Promise<OcrJobView | null> {
  const ctx = await requireTenantContext();
  try {
    return await pollOcrJobImpl(ctx, jobId);
  } catch (err) {
    if (err instanceof AddonDisabledError) return null;
    throw err;
  }
}
