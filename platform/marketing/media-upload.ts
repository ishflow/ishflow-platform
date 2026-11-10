import { randomUUID } from 'node:crypto';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * R2-backed media library helpers for marketing CMS.
 *
 * Why a dedicated module instead of reusing the addon `storage.ts`:
 *   - marketing media is tenant-agnostic (lives at `marketing/<uuid>.<ext>`);
 *   - the editor needs a list + delete operation;
 *   - file size + mime allowlist is enforced server-side here.
 *
 * Uses the same R2 bucket + credentials as the addon storage.
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

export const MARKETING_MEDIA_PREFIX = 'marketing/';

export const MARKETING_MEDIA_MAX_BYTES = 5 * 1024 * 1024; // 5MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export const MARKETING_ALLOWED_MIME = Object.keys(MIME_TO_EXT);

export class MediaValidationError extends Error {
  constructor(
    message: string,
    public readonly code: 'too_large' | 'bad_mime',
  ) {
    super(message);
    this.name = 'MediaValidationError';
  }
}

export interface MarketingMediaObject {
  key: string;
  size: number;
  uploadedAt: Date;
  contentType: string | null;
}

function bucket(): string {
  const value = process.env.R2_BUCKET;
  if (!value) throw new Error('R2_BUCKET is not configured');
  return value;
}

function publicBaseUrl(): string | null {
  // Optional — Cloudflare R2 public-access URL prefix (e.g. https://cdn.ishflow.com).
  return process.env.R2_PUBLIC_URL ?? null;
}

/**
 * Build the public-ish URL for an R2 object. If `R2_PUBLIC_URL` is set we
 * return that direct URL (no signing). Otherwise we return a 1-hour signed
 * URL for preview. The signed URL is good enough for the SA editor list;
 * the public marketing site is expected to use the direct CDN.
 */
export async function marketingMediaUrl(key: string): Promise<string> {
  const base = publicBaseUrl();
  if (base) {
    const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${normalized}/${key}`;
  }
  return await signedGetUrl(key, 3600);
}

async function signedGetUrl(key: string, expiresIn: number): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket(), Key: key });
  return getSignedUrl(getClient(), cmd, { expiresIn });
}

/** Validate + upload a single marketing image. Returns the new object key. */
export async function uploadMarketingMedia(input: {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
}): Promise<{ key: string; size: number }> {
  if (input.bytes.byteLength > MARKETING_MEDIA_MAX_BYTES) {
    throw new MediaValidationError(
      `File exceeds the ${MARKETING_MEDIA_MAX_BYTES / 1024 / 1024}MB limit`,
      'too_large',
    );
  }
  const ext = MIME_TO_EXT[input.contentType];
  if (!ext) {
    throw new MediaValidationError(
      `Unsupported file type: ${input.contentType || 'unknown'}`,
      'bad_mime',
    );
  }
  const key = `${MARKETING_MEDIA_PREFIX}${randomUUID()}.${ext}`;
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: input.bytes,
      ContentType: input.contentType,
      ContentLength: input.bytes.byteLength,
      Metadata: {
        'original-filename': sanitiseFilename(input.filename),
      },
    }),
  );
  return { key, size: input.bytes.byteLength };
}

function sanitiseFilename(name: string): string {
  // strip non-ASCII + reduce whitespace so R2 metadata stays valid
  // biome-ignore lint/suspicious/noControlCharactersInRegex: deliberately strips control chars
  return name.replace(/[^\x20-\x7e]/g, '').slice(0, 120);
}

/** List every object under the marketing prefix, newest first. */
export async function listMarketingMedia(): Promise<MarketingMediaObject[]> {
  const out: MarketingMediaObject[] = [];
  let token: string | undefined;
  do {
    const res = await getClient().send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: MARKETING_MEDIA_PREFIX,
        ContinuationToken: token,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (!obj.Key) continue;
      out.push({
        key: obj.Key,
        size: obj.Size ?? 0,
        uploadedAt: obj.LastModified ?? new Date(0),
        contentType: null,
      });
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  // Newest first.
  out.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  return out;
}

/** Delete an object by key. Silent if it doesn't exist. */
export async function deleteMarketingMedia(key: string): Promise<void> {
  if (!key.startsWith(MARKETING_MEDIA_PREFIX)) {
    throw new Error(`Refusing to delete object outside ${MARKETING_MEDIA_PREFIX}: ${key}`);
  }
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
