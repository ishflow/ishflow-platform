import type { AppContext } from '@/platform/auth/current-context';
import type { Tenant, User } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ──────────────────────────────────────────────────────────────────────────
// Module-level mocks. Must be declared before imports so vi.mock hoists.
// ──────────────────────────────────────────────────────────────────────────

type FakeAttachment = {
  id: string;
  tenantId: string;
  entity: string;
  entityId: string;
  filename: string;
  contentType: string;
  size: number;
  objectKey: string;
  uploadedBy: string;
};

type FakeOcrJob = {
  id: string;
  tenantId: string;
  createdById: string;
  attachmentId: string;
  status: 'pending' | 'running' | 'done' | 'failed';
};

const attachmentInserts: FakeAttachment[] = [];
const ocrInserts: FakeOcrJob[] = [];
const putCalls: Array<{ key: string; contentType: string; size: number }> = [];

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: async <T>(fn: (tx: unknown) => Promise<T>) =>
    fn({
      attachment: {
        create: async ({ data }: { data: FakeAttachment }) => {
          attachmentInserts.push(data);
          return data;
        },
      },
      purchaseInvoiceOcrJob: {
        create: async ({ data }: { data: FakeOcrJob }) => {
          ocrInserts.push(data);
          return data;
        },
      },
    }),
}));

vi.mock('./storage', () => ({
  buildOcrObjectKey: (tenantId: string, jobId: string, _filename: string, _ct: string) =>
    `tenants/${tenantId}/ocr/${jobId}.bin`,
  putOcrObject: async (key: string, body: Uint8Array, contentType: string) => {
    putCalls.push({ key, contentType, size: body.byteLength });
  },
}));

const { startOcrJob, InvalidOcrFileError } = await import('./start-ocr-job');
const { AddonDisabledError } = await import('@/platform/addons/assert-addon');

function makeCtx(addons: Array<'ai_invoice_ocr' | 'bank_integration'>): AppContext & {
  tenant: Tenant;
  user: User;
} {
  return {
    user: { id: 'u-1' } as User,
    tenant: { id: 'tenant-1', currency: 'RUB' } as Tenant,
    membership: null,
    permissions: new Set(),
    scopesByEntity: new Map(),
    addons: new Set(addons),
  };
}

describe('startOcrJob', () => {
  beforeEach(() => {
    attachmentInserts.length = 0;
    ocrInserts.length = 0;
    putCalls.length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws AddonDisabledError when the addon flag is off', async () => {
    await expect(
      startOcrJob(makeCtx([]), {
        bytes: new Uint8Array([0xff, 0xd8, 0xff]),
        filename: 'invoice.jpg',
        contentType: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(AddonDisabledError);
    expect(putCalls).toHaveLength(0);
    expect(ocrInserts).toHaveLength(0);
  });

  it('rejects unsupported mime types', async () => {
    await expect(
      startOcrJob(makeCtx(['ai_invoice_ocr']), {
        bytes: new Uint8Array([1, 2, 3]),
        filename: 'invoice.exe',
        contentType: 'application/x-msdownload',
      }),
    ).rejects.toBeInstanceOf(InvalidOcrFileError);
    expect(putCalls).toHaveLength(0);
  });

  it('rejects oversized files', async () => {
    const tooBig = new Uint8Array(11 * 1024 * 1024); // 11 MB
    await expect(
      startOcrJob(makeCtx(['ai_invoice_ocr']), {
        bytes: tooBig,
        filename: 'invoice.jpg',
        contentType: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(InvalidOcrFileError);
    expect(putCalls).toHaveLength(0);
  });

  it('rejects empty files', async () => {
    await expect(
      startOcrJob(makeCtx(['ai_invoice_ocr']), {
        bytes: new Uint8Array(0),
        filename: 'invoice.jpg',
        contentType: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(InvalidOcrFileError);
    expect(putCalls).toHaveLength(0);
  });

  it('uploads + inserts Attachment + OcrJob rows on the happy path', async () => {
    const ctx = makeCtx(['ai_invoice_ocr']);
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const result = await startOcrJob(ctx, {
      bytes,
      filename: 'scan.jpg',
      contentType: 'image/jpeg',
    });

    expect(result.jobId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.attachmentId).toMatch(/^[0-9a-f-]{36}$/);

    expect(putCalls).toHaveLength(1);
    const put = putCalls[0];
    if (!put) throw new Error('no put call recorded');
    expect(put.size).toBe(bytes.byteLength);
    expect(put.contentType).toBe('image/jpeg');

    expect(attachmentInserts).toHaveLength(1);
    expect(attachmentInserts[0]).toMatchObject({
      id: result.attachmentId,
      tenantId: 'tenant-1',
      entity: 'purchase_invoice_ocr',
      entityId: result.jobId,
      filename: 'scan.jpg',
      contentType: 'image/jpeg',
      uploadedBy: 'u-1',
    });

    expect(ocrInserts).toHaveLength(1);
    expect(ocrInserts[0]).toMatchObject({
      id: result.jobId,
      tenantId: 'tenant-1',
      createdById: 'u-1',
      attachmentId: result.attachmentId,
      status: 'pending',
    });
  });

  it('sanitizes unsafe filenames before storing them', async () => {
    const ctx = makeCtx(['ai_invoice_ocr']);
    await startOcrJob(ctx, {
      bytes: new Uint8Array([0xff, 0xd8, 0xff]),
      filename: '../../etc/passwd.jpg',
      contentType: 'image/jpeg',
    });
    // Path separators are the only chars that could let a filename escape
    // the object-key prefix; `..` is harmless as a literal name fragment.
    const inserted = attachmentInserts[0];
    if (!inserted) throw new Error('no attachment insert recorded');
    expect(inserted.filename).not.toContain('/');
    expect(inserted.filename).toMatch(/^[A-Za-z0-9._-]+$/);
  });
});
