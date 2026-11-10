import { assertAddonEnabled } from '@/platform/addons/assert-addon';
import type { AppContext } from '@/platform/auth/current-context';
import { withBypass } from '@/platform/db/tenant-context';
import type { OcrJobStatus, Tenant } from '@prisma/client';
import { matchProductsForLines, matchSupplier } from './match';
import { type OcrInvoice, ocrInvoiceSchema } from './schemas';
import { signOcrGetUrl } from './storage';

type TenantCtx = AppContext & { tenant: Tenant };

export type OcrJobLineView = {
  rawText: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  total: number | null;
  vatRate: 0 | 10 | 20 | null;
  /** UUID of the matched product, or null if no match. */
  matchedProductId: string | null;
};

export type OcrJobView = {
  jobId: string;
  status: OcrJobStatus;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  imageUrl: string | null;
  parsed: {
    supplierName: string | null;
    supplierInn: string | null;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    currency: string | null;
    totalAmount: number | null;
    confidence: number;
    lines: OcrJobLineView[];
  } | null;
  /** UUID of the matched supplier; null if status<done or no match. */
  matchedSupplierId: string | null;
  /** Tenant default currency, used as fallback when parsed.currency is null. */
  tenantCurrency: string;
};

/**
 * Read the current state of an OCR job and decorate it with:
 *   - signed GET URL for the source image
 *   - matched supplier id (best-effort)
 *   - matched product id per line (best-effort)
 *
 * Caller is responsible for ensuring the tenant has the addon enabled
 * (we re-assert here as defence-in-depth). Returns `null` if the job
 * doesn't belong to the caller's tenant or doesn't exist.
 */
export async function pollOcrJob(ctx: TenantCtx, jobId: string): Promise<OcrJobView | null> {
  assertAddonEnabled(ctx, 'ai_invoice_ocr');
  const tenantId = ctx.tenant.id;

  const row = await withBypass((tx) =>
    tx.purchaseInvoiceOcrJob.findUnique({
      where: { id: jobId },
      include: { attachment: true },
    }),
  );
  if (!row || row.tenantId !== tenantId) return null;

  // Signed URL for the preview. Best-effort: if R2 is misconfigured the
  // preview just won't render (the user still gets the parsed data).
  let imageUrl: string | null = null;
  try {
    imageUrl = await signOcrGetUrl(row.attachment.objectKey);
  } catch {
    imageUrl = null;
  }

  let parsed: OcrJobView['parsed'] = null;
  let matchedSupplierId: string | null = null;

  if (row.status === 'done' && row.output) {
    const out = ocrInvoiceSchema.safeParse(row.output);
    if (out.success) {
      const ocr: OcrInvoice = out.data;
      const matches = await withBypass(async (tx) => {
        const supplier = await matchSupplier(tx, {
          supplierName: ocr.supplierName,
          supplierInn: ocr.supplierInn,
        });
        const products = await matchProductsForLines(tx, ocr.lines);
        return { supplier, products };
      });
      matchedSupplierId = matches.supplier?.id ?? null;
      parsed = {
        supplierName: ocr.supplierName,
        supplierInn: ocr.supplierInn,
        invoiceNumber: ocr.invoiceNumber,
        invoiceDate: ocr.invoiceDate,
        currency: ocr.currency,
        totalAmount: ocr.totalAmount,
        confidence: ocr.confidence,
        lines: ocr.lines.map((l, i) => ({
          rawText: l.rawText,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          total: l.total,
          vatRate: l.vatRate,
          matchedProductId: matches.products[i]?.id ?? null,
        })),
      };
    }
  }

  return {
    jobId: row.id,
    status: row.status,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    imageUrl,
    parsed,
    matchedSupplierId,
    tenantCurrency: ctx.tenant.currency ?? 'RUB',
  };
}
