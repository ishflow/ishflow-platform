import { z } from 'zod';
import { UuidSchema } from './common';

export const CreateTenantRequestSchema = z.object({
  name: z.string().min(2).max(80).trim(),
  currency: z.string().length(3),
  locale: z.enum(['ru', 'en', 'tr', 'uz', 'ky', 'de', 'fr', 'zh']),
  brandColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
});

export const CreateTenantResponseSchema = z.object({
  tenantId: UuidSchema,
  jwt: z.string(),
  trialEndsAt: z.string().datetime(),
});

export const SeedDemoRequestSchema = z.object({
  tenantId: UuidSchema,
});

export const SeedDemoResponseSchema = z.object({
  ok: z.literal(true),
  summary: z.object({
    customers: z.number().int().nonnegative(),
    products: z.number().int().nonnegative(),
    documents: z.number().int().nonnegative(),
  }),
});

export const DeleteAccountResponseSchema = z.object({
  deletedAt: z.string().datetime(),
});

export const SetupProgressSchema = z.object({
  workspaceCreated: z.boolean(),
  demoImported: z.boolean(),
  invitesSent: z.boolean(),
  firstCustomerAdded: z.boolean(),
  firstProductAdded: z.boolean(),
  firstInvoicePosted: z.boolean(),
});

export type CreateTenantRequest = z.infer<typeof CreateTenantRequestSchema>;
export type CreateTenantResponse = z.infer<typeof CreateTenantResponseSchema>;
export type SeedDemoRequest = z.infer<typeof SeedDemoRequestSchema>;
export type SeedDemoResponse = z.infer<typeof SeedDemoResponseSchema>;
export type DeleteAccountResponse = z.infer<typeof DeleteAccountResponseSchema>;
export type SetupProgress = z.infer<typeof SetupProgressSchema>;
