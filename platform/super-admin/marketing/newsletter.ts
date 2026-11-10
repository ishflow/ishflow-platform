import { withBypass } from '@/platform/db/tenant-context';
import type { Prisma } from '@prisma/client';

export interface NewsletterSubscriberRow {
  id: string;
  email: string;
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
  source: string | null;
  createdAt: Date;
}

export async function listNewsletterSubscribers(): Promise<NewsletterSubscriberRow[]> {
  return withBypass(async (tx) => {
    const rows = await tx.marketingNewsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      confirmedAt: r.confirmedAt,
      unsubscribedAt: r.unsubscribedAt,
      source: r.source,
      createdAt: r.createdAt,
    }));
  });
}

export interface UnsubscribeInput {
  id: string;
  actorClerkId: string;
  actorIp?: string | null;
  actorUserAgent?: string | null;
}

export async function unsubscribeNewsletter(input: UnsubscribeInput): Promise<void> {
  await withBypass(async (tx) => {
    const before = await tx.marketingNewsletterSubscriber.findUnique({ where: { id: input.id } });
    if (!before) throw new Error('subscriber not found');
    if (before.unsubscribedAt) return;
    await tx.marketingNewsletterSubscriber.update({
      where: { id: input.id },
      data: { unsubscribedAt: new Date() },
    });
    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'marketing.newsletter.unsubscribe',
        before: { email: before.email, unsubscribedAt: null } as Prisma.InputJsonValue,
        after: {
          email: before.email,
          unsubscribedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        ip: input.actorIp ?? null,
        userAgent: input.actorUserAgent ?? null,
      },
    });
  });
}

export function subscribersToCsv(rows: ReadonlyArray<NewsletterSubscriberRow>): string {
  const header = ['email', 'confirmed_at', 'unsubscribed_at', 'source', 'created_at'];
  const lines = rows.map((r) => [
    csvEscape(r.email),
    csvEscape(r.confirmedAt?.toISOString() ?? ''),
    csvEscape(r.unsubscribedAt?.toISOString() ?? ''),
    csvEscape(r.source ?? ''),
    csvEscape(r.createdAt.toISOString()),
  ]);
  return [header.join(','), ...lines.map((l) => l.join(','))].join('\n');
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
