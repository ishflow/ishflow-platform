import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * R2 helpers scoped to the ai_invoice_ocr addon. We can't reuse the
 * existing `app/api/attachments/sign-put` flow because the standard
 * Attachment service requires a registered metadata entity — OCR jobs
 * are stored under a synthetic `purchase_invoice_ocr` entity key that
 * isn't part of the metadata registry. So we do server-side uploads
 * directly against the same R2 bucket using the same env-driven config.
 */

let cached: S3Client | undefined;

function getClient(): S3Client {
  if (cached) return cached;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('R2 is not configured — R2_ACCOUNT_ID missing');
  }
  cached = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
  });
  return cached;
}

const SAFE_EXT = /^[a-z0-9]{1,8}$/i;

function pickExtension(filename: string, contentType: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot >= 0) {
    const ext = filename.slice(dot + 1).toLowerCase();
    if (SAFE_EXT.test(ext)) return ext;
  }
  // Fallback to mime-derived extension.
  const fromMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  return fromMime[contentType] ?? 'bin';
}

/**
 * Build the canonical R2 object key for an OCR upload:
 *   tenants/<tenantId>/ocr/<jobId>.<ext>
 *
 * The extension is derived from the user's filename (allowlist) or
 * falls back to the mime type. Anything outside the allowlist becomes
 * `.bin` — the file is still uploaded but stored anonymously.
 */
export function buildOcrObjectKey(
  tenantId: string,
  jobId: string,
  filename: string,
  contentType: string,
): string {
  const ext = pickExtension(filename, contentType);
  return `tenants/${tenantId}/ocr/${jobId}.${ext}`;
}

/**
 * Upload an image/PDF directly to R2. Used by `startOcrJob` to land the
 * source bytes before the AI extraction runs.
 */
export async function putOcrObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.byteLength,
    }),
  );
}

/**
 * Download the bytes for an OCR upload from R2. Used by `runOcrJob` so the
 * vision model can read the source image.
 */
export async function getOcrObject(key: string): Promise<Uint8Array> {
  const result = await getClient().send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    }),
  );
  const body = result.Body;
  if (!body) throw new Error(`R2 object ${key} has empty body`);
  // The Node runtime returns a Readable stream we can iterate; the
  // browser/edge runtime returns a Web ReadableStream. Coerce to Uint8Array.
  const chunks: Uint8Array[] = [];
  // biome-ignore lint/suspicious/noExplicitAny: body type union across runtimes
  for await (const chunk of body as any) {
    chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
  }
  let total = 0;
  for (const c of chunks) total += c.byteLength;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/**
 * Build a short-lived signed GET URL so the scan-dialog can render the
 * uploaded image alongside the parsed preview.
 */
export async function signOcrGetUrl(key: string, expiresSec = 900): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn: expiresSec });
}
