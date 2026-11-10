import { withBypass } from '@/platform/db/tenant-context';
import { z } from 'zod';

const PLANS = ['free', 'starter', 'pro', 'business', 'enterprise'] as const;

/**
 * Upgrade-request producer. Same trust model as the support-ticket producer
 * (`platform/support/create-ticket.ts`): `upgrade_request` is a platform-level
 * table with NO RLS, so we write through `withBypass` and set `tenantId` /
 * `userId` / `companyName` / `contactEmail` from the already-verified server
 * context — NEVER from client input. Only `contactPhone` / `requestedPlan` /
 * `note` come from the form.
 */
export const createUpgradeRequestSchema = z.object({
  contactPhone: z.string().trim().min(1).max(40),
  requestedPlan: z.enum(PLANS).optional(),
  note: z.string().trim().max(1000).optional(),
});

export type CreateUpgradeRequestInput = z.infer<typeof createUpgradeRequestSchema>;

export type CreateUpgradeRequestContext = {
  /** From the authenticated server context — never client-supplied. */
  tenantId: string;
  userId: string | null;
  companyName: string;
  contactEmail: string;
};

export async function createUpgradeRequestRecord(
  input: CreateUpgradeRequestInput,
  context: CreateUpgradeRequestContext,
): Promise<string> {
  const parsed = createUpgradeRequestSchema.parse(input);
  return withBypass(async (tx) => {
    const row = await tx.upgradeRequest.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId,
        companyName: context.companyName,
        contactEmail: context.contactEmail,
        contactPhone: parsed.contactPhone,
        requestedPlan: parsed.requestedPlan ?? null,
        note: parsed.note ?? null,
        status: 'pending',
      },
      select: { id: true },
    });
    return row.id;
  });
}
