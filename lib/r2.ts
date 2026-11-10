import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function resolveEndpoint(): string | undefined {
  return process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined;
}

let cached: S3Client | undefined;
function getClient(): S3Client {
  if (cached) return cached;
  const endpoint = resolveEndpoint();
  if (!endpoint) throw new Error('R2 is not configured — R2_ACCOUNT_ID missing');
  cached = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
    // AWS SDK v3 (≥ 3.729) auto-injects `x-amz-checksum-crc32` and
    // `x-amz-sdk-checksum-algorithm` into the signed URL by default. R2's
    // CORS policy then has to list those headers in AllowedHeaders or the
    // browser preflight fails. Switch to "WHEN_REQUIRED" so the SDK only
    // adds checksums when a command explicitly asks for one — keeps the
    // signed PUT URL minimal and CORS config simple (content-type +
    // content-length only). See aws/aws-sdk-js-v3#6810.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return cached;
}

const SAFE_FILENAME = /^[A-Za-z0-9._-]+$/;
const MAX_BYTES = 20 * 1024 * 1024;

export function buildObjectKey(
  tenantId: string,
  entityId: string,
  attachmentId: string,
  filename: string,
): string {
  if (!SAFE_FILENAME.test(filename)) {
    throw new Error(`unsafe filename: ${filename}`);
  }
  return `tenants/${tenantId}/${entityId}/${attachmentId}/${filename}`;
}

export async function signPutUrl(
  key: string,
  contentType: string,
  contentLength: number,
  expiresSec = 900,
): Promise<string> {
  if (contentLength > MAX_BYTES) {
    throw new Error('file too large (max 20MB)');
  }
  const cmd = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn: expiresSec });
}

export async function signGetUrl(
  key: string,
  opts: {
    filename?: string;
    expiresSec?: number;
    /** "inline" lets the browser render the file directly (PDF in iframe,
     *  image in <img>); "attachment" forces a download. Defaults to
     *  "attachment" to preserve existing download behavior. */
    disposition?: 'inline' | 'attachment';
  } = {},
): Promise<string> {
  const { filename, expiresSec = 900, disposition = 'attachment' } = opts;
  const safeName = filename && SAFE_FILENAME.test(filename) ? filename : 'download';
  const cmd = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ResponseContentDisposition: `${disposition}; filename="${safeName}"`,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn: expiresSec });
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    }),
  );
}
