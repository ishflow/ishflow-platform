import { z } from 'zod';
import { UuidSchema } from './common';

export const OpenInvoicesQuerySchema = z.object({
  counterpartyId: UuidSchema,
  direction: z.enum(['receivable', 'payable']),
});

export const OpenInvoiceRowSchema = z.object({
  invoiceId: UuidSchema,
  documentType: z.string(),
  invoiceNumber: z.string(),
  invoiceDate: z.string().datetime(),
  totalAmount: z.number(),
  paidAmount: z.number(),
  openAmount: z.number(),
  currency: z.string(),
});

export const OpenInvoicesResponseSchema = z.object({
  items: z.array(OpenInvoiceRowSchema),
});

export const LinkedInvoiceSchema = z.object({
  invoiceId: UuidSchema,
  amount: z.number().positive(),
});

export type OpenInvoiceRow = z.infer<typeof OpenInvoiceRowSchema>;
export type OpenInvoicesResponse = z.infer<typeof OpenInvoicesResponseSchema>;
export type LinkedInvoice = z.infer<typeof LinkedInvoiceSchema>;
