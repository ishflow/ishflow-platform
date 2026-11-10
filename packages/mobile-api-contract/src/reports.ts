import { z } from 'zod';
import { DecimalStringSchema, IsoDateSchema } from './common';

// ---------------------------------------------------------------------------
// Sales summary
// ---------------------------------------------------------------------------

export const SalesSummaryQuerySchema = z.object({
  from: IsoDateSchema,
  to: IsoDateSchema,
});

export const SalesSummaryCustomerRowSchema = z.object({
  customerId: z.string().uuid(),
  customerName: z.string(),
  total: DecimalStringSchema,
  count: z.number().int().nonnegative(),
});

export const SalesSummaryProductRowSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  qty: DecimalStringSchema,
  revenue: DecimalStringSchema,
});

export const SalesSummaryResponseSchema = z.object({
  period: z.object({ from: IsoDateSchema, to: IsoDateSchema }),
  totalRevenue: DecimalStringSchema,
  invoiceCount: z.number().int().nonnegative(),
  byCustomer: z.array(SalesSummaryCustomerRowSchema),
  byProduct: z.array(SalesSummaryProductRowSchema),
});

export type SalesSummaryResponse = z.infer<typeof SalesSummaryResponseSchema>;

// ---------------------------------------------------------------------------
// A/R aging
// ---------------------------------------------------------------------------

export const ArAgingBucketLabelSchema = z.enum(['0-30', '31-60', '61-90', '90+']);

export const ArAgingBucketRowSchema = z.object({
  label: ArAgingBucketLabelSchema,
  total: DecimalStringSchema,
  count: z.number().int().nonnegative(),
});

export const ArAgingCustomerRowSchema = z.object({
  customerId: z.string().uuid(),
  customerName: z.string(),
  total: DecimalStringSchema,
  oldestDays: z.number().int().nonnegative(),
});

export const ArAgingResponseSchema = z.object({
  asOf: IsoDateSchema,
  buckets: z.array(ArAgingBucketRowSchema),
  byCustomer: z.array(ArAgingCustomerRowSchema),
});

export type ArAgingResponse = z.infer<typeof ArAgingResponseSchema>;

// ---------------------------------------------------------------------------
// Gross profit
// ---------------------------------------------------------------------------

export const GrossProfitQuerySchema = z.object({
  from: IsoDateSchema,
  to: IsoDateSchema,
});

export const GrossProfitProductRowSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  revenue: DecimalStringSchema,
  cogs: DecimalStringSchema,
  profit: DecimalStringSchema,
  marginPct: DecimalStringSchema,
});

export const GrossProfitResponseSchema = z.object({
  period: z.object({ from: IsoDateSchema, to: IsoDateSchema }),
  revenue: DecimalStringSchema,
  cogs: DecimalStringSchema,
  grossProfit: DecimalStringSchema,
  marginPct: DecimalStringSchema,
  byProduct: z.array(GrossProfitProductRowSchema),
});

export type GrossProfitResponse = z.infer<typeof GrossProfitResponseSchema>;

// ---------------------------------------------------------------------------
// XLSX/CSV export query (shared by /api/mobile/reports/{type}/export)
// ---------------------------------------------------------------------------

export const ReportExportQuerySchema = z.object({
  type: z.enum(['gross-profit', 'ar-aging', 'ap-aging', 'sales-by-customer', 'sales-by-product']),
  format: z.enum(['csv', 'xlsx']),
  from: z.string().optional(),
  to: z.string().optional(),
  dims: z.string().optional(),
});

export type ReportExportQuery = z.infer<typeof ReportExportQuerySchema>;
