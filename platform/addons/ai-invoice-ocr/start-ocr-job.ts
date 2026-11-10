import { randomUUID } from 'node:crypto';
import { assertAddonEnabled } from '@/platform/addons/assert-addon';
import type { AppContext } from '@/platform/auth/current-context';
import { withBypass } from '@/platform/db/tenant-context';
import type { Tenant, User } from '@prisma/client';
import { OCR_MAX_FILE_BYTES, type OcrAllowedMime, isAllowedOcrMime } from './schemas';
import { buildOcrObjectKey, putOcrObject } from './storage';

/**
 * Input contract for `startOcrJob`. The file blob is passed in directly
 * (from a server-action FormData). Filename + content type are validated
 * against the allowlist.
 */
export type StartOcrJobInput = {
  bytes: Uint8Array;
  filename: string;
  contentType: string;
};

export type StartOcrJobResult = {
  jobId: string;
  attachmentId: string;
};

/**
 * Thrown when the user uploads a file we won't process. Distinct from
 * AddonDisabledError so the API surface can return 4xx with a precise
 * code (`invalid_file_type` / `file_too_large`).
 */
export class InvalidOcrFileError extends Error {
  constructor(
    public readonly code: 'invalid_file_type' | 'file_too_large' | 'empty_file',
    message: string,
  ) {
    super(message);
    this.name = 'InvalidOcrFileError';
  }
}

type TenantCtx = AppContext & { tenant: Tenant; user: User };

/**
 * Start a new OCR job. Steps:
 *   1. Gate on the addon flag.
 *   2. Validate mime + size.
 *   3. Upload to R2 (`tenants/<tenantId>/ocr/<jobId>.<ext>`).
 *   4. Insert an Attachment row (entity = `purchase_invoice_ocr`,
 *      entityId = jobId).
 *   5. Insert the OcrJob row with status=pending.
 *
 * Returns the jobId so the caller can kick off `runOcrJob` (foreground
 * or via `after()`) and the client can poll.
 *
 * The Attachment + OcrJob writes run under `withBypass` because
 * `purchase_invoice_ocr` is a synthetic entity not in the metadata
 * registry — RLS on both tables still enforces tenant isolation via the
 * tenantId column. The bypass is fine because every insert pins
 * tenantId = ctx.tenant.id.
 */
export async function startOcrJob(
  ctx: TenantCtx,
  input: StartOcrJobInput,
): Promise<StartOcrJobResult> {
  assertAddonEnabled(ctx, 'ai_invoice_ocr');

  if (input.bytes.byteLength === 0) {
    throw new InvalidOcrFileError('empty_file', 'Uploaded file is empty');
  }
  if (input.bytes.byteLength > OCR_MAX_FILE_BYTES) {
    throw new InvalidOcrFileError(
      'file_too_large',
      `File exceeds maximum size of ${OCR_MAX_FILE_BYTES} bytes`,
    );
  }
  if (!isAllowedOcrMime(input.contentType)) {
    throw new InvalidOcrFileError(
      'invalid_file_type',
      `Unsupported content type: ${input.contentType}`,
    );
  }

  const tenantId = ctx.tenant.id;
  const jobId = randomUUID();
  const attachmentId = randomUUID();
  const safeName = sanitizeFilename(input.filename);
  const objectKey = buildOcrObjectKey(
    tenantId,
    jobId,
    safeName,
    input.contentType as OcrAllowedMime,
  );

  // Upload first; if R2 fails we never insert the row and the caller
  // gets the underlying error (network/credentials).
  await putOcrObject(objectKey, input.bytes, input.contentType);

  await withBypass(async (tx) => {
    await tx.attachment.create({
      data: {
        id: attachmentId,
        tenantId,
        entity: 'purchase_invoice_ocr',
        entityId: jobId,
        filename: safeName,
        contentType: input.contentType,
        size: input.bytes.byteLength,
        objectKey,
        uploadedBy: ctx.user.id,
      },
    });
    await tx.purchaseInvoiceOcrJob.create({
      data: {
        id: jobId,
        tenantId,
        createdById: ctx.user.id,
        attachmentId,
        status: 'pending',
      },
    });
  });

  return { jobId, attachmentId };
}

const SAFE_FILENAME = /^[A-Za-z0-9._-]+$/;

/**
 * Reduce a user-supplied filename to something safe to use as an object
 * key suffix. Strips path separators and non-printable chars; falls back
 * to `upload.bin` if everything is stripped.
 */
function sanitizeFilename(name: string): string {
  const trimmed = name.trim();
  if (SAFE_FILENAME.test(trimmed) && trimmed.length <= 255) return trimmed;
  // Replace unsafe runs with `_` and clip.
  const replaced = trimmed.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 255);
  if (replaced.length === 0) return 'upload.bin';
  return replaced;
}
