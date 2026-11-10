import { withBypass } from '@/platform/db/tenant-context';
import type { Prisma } from '@prisma/client';

export interface MarketingLeadRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  size: string | null;
  message: string;
  source: string | null;
  status: string;
  createdAt: Date;
}

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

export async function listMarketingLeads(opts?: {
  status?: string | null;
}): Promise<MarketingLeadRow[]> {
  return withBypass(async (tx) => {
    const where: Prisma.MarketingLeadWhereInput =
      opts?.status && isLeadStatus(opts.status) ? { status: opts.status } : {};
    const rows = await tx.marketingLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      company: r.company,
      size: r.size,
      message: r.message,
      source: r.source,
      status: r.status,
      createdAt: r.createdAt,
    }));
  });
}

export interface UpdateLeadStatusInput {
  id: string;
  status: LeadStatus;
  actorClerkId: string;
  actorIp?: string | null;
  actorUserAgent?: string | null;
}

export async function updateLeadStatus(input: UpdateLeadStatusInput): Promise<void> {
  await withBypass(async (tx) => {
    const before = await tx.marketingLead.findUnique({ where: { id: input.id } });
    if (!before) throw new Error('lead not found');
    if (before.status === input.status) return;
    await tx.marketingLead.update({
      where: { id: input.id },
      data: { status: input.status },
    });
    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'marketing.lead.status',
        before: { status: before.status } as Prisma.InputJsonValue,
        after: { status: input.status } as Prisma.InputJsonValue,
        ip: input.actorIp ?? null,
        userAgent: input.actorUserAgent ?? null,
      },
    });
  });
}
