import { randomBytes } from 'node:crypto';
import { seedSystemRoles } from '@/platform/auth/seed-system-roles';
import { withBypass } from '@/platform/db/tenant-context';
import { clerkClient } from '@clerk/nextjs/server';
import type { Membership, Tenant } from '@prisma/client';

export type OnboardingErrorCode =
  | 'already_onboarded'
  | 'user_not_found'
  | 'clerk_org_failed'
  | 'slug_exhausted';

export class OnboardingError extends Error {
  constructor(
    public readonly code: OnboardingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OnboardingError';
  }

  static alreadyOnboarded(userId: string): OnboardingError {
    return new OnboardingError(
      'already_onboarded',
      `User ${userId} already has an active membership; onboarding may only run for zero-membership users.`,
    );
  }

  static userNotFound(userId: string): OnboardingError {
    return new OnboardingError('user_not_found', `User ${userId} not found.`);
  }

  static clerkOrgFailed(reason: string): OnboardingError {
    return new OnboardingError('clerk_org_failed', `Clerk organization creation failed: ${reason}`);
  }

  static slugExhausted(base: string): OnboardingError {
    return new OnboardingError(
      'slug_exhausted',
      `Failed to allocate a unique slug derived from "${base}" after 6 attempts.`,
    );
  }
}

export type SupportedLocale = 'ru' | 'en' | 'tr' | 'uz' | 'ky' | 'de' | 'fr' | 'zh';

export interface CreateTenantInput {
  userId: string;
  name: string;
  currency: string;
  locale: SupportedLocale;
}

export interface CreateTenantResult {
  tenant: Tenant;
  ownerMembership: Membership;
}

const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000;
const SLUG_MAX_LEN = 60;
const MAX_SLUG_RETRIES = 5;

export function buildSlug(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LEN);
  return cleaned || 'workspace';
}

function withSuffix(base: string): string {
  const suffix = `-${randomBytes(3).toString('hex')}`;
  return `${base.slice(0, SLUG_MAX_LEN - suffix.length)}${suffix}`;
}

function isSlugUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { code?: string; meta?: { target?: string[] | string } };
  if (e.code !== 'P2002') return false;
  const target = e.meta?.target;
  const candidates = Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];
  return candidates.some((t) => t === 'slug' || t.toLowerCase().includes('slug'));
}

/**
 * Create a brand-new tenant + Clerk organization + owner membership for a user
 * who currently has zero memberships. Wraps Clerk + Prisma in a best-effort
 * atomic flow: on DB failure inside the transaction, the orphan Clerk org is
 * compensated with a delete (Clerk has no transactional API).
 */
export async function createTenantForUser(input: CreateTenantInput): Promise<CreateTenantResult> {
  const { userId, name, currency, locale } = input;

  const user = await withBypass((tx) =>
    tx.user.findUnique({ where: { id: userId }, select: { id: true, clerkId: true } }),
  );
  if (!user) throw OnboardingError.userNotFound(userId);

  const existingMembershipCount = await withBypass((tx) =>
    tx.membership.count({ where: { userId, tenant: { deletedAt: null } } }),
  );
  if (existingMembershipCount > 0) throw OnboardingError.alreadyOnboarded(userId);

  const baseSlug = buildSlug(name);
  const clerk = await clerkClient();

  for (let attempt = 0; attempt <= MAX_SLUG_RETRIES; attempt++) {
    const slug = attempt === 0 ? baseSlug : withSuffix(baseSlug);
    let clerkOrgId: string | null = null;
    try {
      const clerkOrg = await clerk.organizations.createOrganization({
        name,
        slug,
        createdBy: user.clerkId,
      });
      clerkOrgId = clerkOrg.id;

      return await withBypass(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            clerkOrgId: clerkOrg.id,
            name,
            slug,
            currency,
            defaultLocale: locale,
            plan: 'free',
            status: 'trialing',
            trialEndsAt: new Date(Date.now() + TRIAL_DURATION_MS),
          },
        });
        await seedSystemRoles(tenant.id, tx);
        const ownerRole = await tx.role.findUniqueOrThrow({
          where: { tenantId_name: { tenantId: tenant.id, name: 'owner' } },
          select: { id: true },
        });
        const ownerMembership = await tx.membership.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            roles: { connect: [{ id: ownerRole.id }] },
          },
        });
        return { tenant, ownerMembership };
      });
    } catch (error) {
      if (clerkOrgId) {
        try {
          await clerk.organizations.deleteOrganization(clerkOrgId);
        } catch {
          // Compensating delete is best-effort; original error wins.
        }
        if (isSlugUniqueViolation(error) && attempt < MAX_SLUG_RETRIES) continue;
        throw error;
      }
      if (isSlugUniqueViolation(error) && attempt < MAX_SLUG_RETRIES) continue;
      throw OnboardingError.clerkOrgFailed(error instanceof Error ? error.message : String(error));
    }
  }

  throw OnboardingError.slugExhausted(baseSlug);
}
