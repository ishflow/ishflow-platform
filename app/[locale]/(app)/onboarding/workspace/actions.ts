'use server';

import { randomBytes, randomUUID } from 'node:crypto';
import { seedSystemRoles } from '@/platform/auth/seed-system-roles';
import { withBypass } from '@/platform/db/tenant-context';
import { sendWelcomeEmail } from '@/platform/email/send-welcome';
import { type Locale, defaultLocale, isLocale } from '@/platform/i18n/config';
import type { ActionResult } from '@/platform/ui';
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import type { Tenant } from '@prisma/client';

const TRIAL_MS = 14 * 24 * 60 * 60 * 1000;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function shortRandom(len: number): string {
  return randomBytes(Math.ceil(len / 2))
    .toString('hex')
    .slice(0, len);
}

function pickLocale(raw: unknown): Locale {
  if (typeof raw === 'string' && isLocale(raw)) {
    return raw;
  }
  return defaultLocale;
}

type ClerkIdentity = {
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

async function resolveIdentity(formData: FormData): Promise<ClerkIdentity | null> {
  // Test/dev override path — ONLY when not in production. This lets the
  // integration test exercise the full DB flow without a Clerk session.
  if (process.env.NODE_ENV !== 'production') {
    const overrideClerkId = formData.get('__clerkUserId');
    const overrideEmail = formData.get('__email');
    if (typeof overrideClerkId === 'string' && overrideClerkId.length > 0) {
      return {
        clerkUserId: overrideClerkId,
        email:
          typeof overrideEmail === 'string' && overrideEmail.length > 0
            ? overrideEmail
            : `${overrideClerkId}@example.test`,
        firstName: null,
        lastName: null,
      };
    }
  }

  const session = await auth();
  if (!session.userId) return null;
  const user = await currentUser();
  if (!user) return null;
  const email = user.emailAddresses[0]?.emailAddress ?? null;
  if (!email) return null;
  return {
    clerkUserId: user.id,
    email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  };
}

export async function createWorkspaceAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const locale = pickLocale(formData.get('__locale'));

  const rawName = String(formData.get('name') ?? '').trim();
  const rawSlug = String(formData.get('slug') ?? '').trim();
  const currency = String(formData.get('currency') ?? 'USD').trim() || 'USD';

  const fieldErrors: Record<string, string[]> = {};
  if (!rawName) fieldErrors.name = ['required'];

  let synthesizedSlug = rawSlug ? slugify(rawSlug) : slugify(rawName);
  if (!fieldErrors.name && synthesizedSlug.length < 3) {
    // Fall back to a random slug if the name is too short to slugify.
    synthesizedSlug = `ws-${shortRandom(6)}`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const identity = await resolveIdentity(formData);
  if (!identity) {
    return { ok: false, formError: 'not_signed_in' };
  }

  // Real web users sign up through Clerk's <SignUp>, which auto-creates and
  // activates a personal org ("{firstName}'s Organization"). resolveContext
  // binds to that active org (session org wins over metadata), so if onboarding
  // creates a SEPARATE tenant with a synthetic `local-*` clerkOrgId the user
  // ends up with TWO orgs — and can't switch to the synthetic one because Clerk
  // setActive() rejects a fake org id. So when an active Clerk org exists, ADOPT
  // it (bind the tenant to its real id + rename it). Only the test-override path
  // and users with no active org keep the legacy `local-*` tenant, which is
  // switchable via resolveContext's activeTenantId-metadata path (orgId null).
  const isTestOverride =
    process.env.NODE_ENV !== 'production' &&
    typeof formData.get('__clerkUserId') === 'string' &&
    String(formData.get('__clerkUserId')).length > 0;
  const activeOrgId = isTestOverride ? null : ((await auth()).orgId ?? null);

  try {
    const created = await withBypass(async (tx) => {
      const user = await tx.user.upsert({
        where: { clerkId: identity.clerkUserId },
        create: {
          clerkId: identity.clerkUserId,
          email: identity.email,
          firstName: identity.firstName,
          lastName: identity.lastName,
        },
        update: {
          email: identity.email,
          firstName: identity.firstName,
          lastName: identity.lastName,
        },
      });

      // Resolve a non-colliding slug (only consumed when CREATING a tenant).
      // Loop a few times in case the random suffix itself collides.
      let candidate = synthesizedSlug;
      let attempts = 0;
      while (attempts < 5) {
        const clash = await tx.tenant.findFirst({ where: { slug: candidate } });
        if (!clash) break;
        candidate = `${synthesizedSlug.slice(0, 33)}-${shortRandom(6)}`;
        attempts += 1;
      }
      if (attempts >= 5) {
        throw new Error('slug_resolve_failed');
      }

      let createdTenant: Tenant;
      let isNew = false;
      if (activeOrgId) {
        // Adopt the active Clerk org → exactly one org/tenant, switchable.
        // Upsert by the real clerkOrgId so we MERGE with any tenant a webhook
        // / on-demand sync already created for this org instead of duplicating.
        const existing = await tx.tenant.findUnique({ where: { clerkOrgId: activeOrgId } });
        if (existing) {
          createdTenant = await tx.tenant.update({
            where: { id: existing.id },
            data: { name: rawName, currency, defaultLocale: locale, deletedAt: null },
          });
        } else {
          createdTenant = await tx.tenant.create({
            data: {
              clerkOrgId: activeOrgId,
              name: rawName,
              slug: candidate,
              currency,
              defaultLocale: locale,
              trialEndsAt: new Date(Date.now() + TRIAL_MS),
            },
          });
          isNew = true;
        }
      } else {
        createdTenant = await tx.tenant.create({
          data: {
            clerkOrgId: `local-${randomUUID().replace(/-/g, '').slice(0, 12)}`,
            name: rawName,
            slug: candidate,
            currency,
            defaultLocale: locale,
            trialEndsAt: new Date(Date.now() + TRIAL_MS),
          },
        });
        isNew = true;
      }

      await seedSystemRoles(createdTenant.id, tx);

      const ownerRole = await tx.role.findUniqueOrThrow({
        where: { tenantId_name: { tenantId: createdTenant.id, name: 'owner' } },
      });

      // Upsert (not create): a webhook may have already created this membership
      // for the adopted org. Keep existing roles — never downgrade an owner.
      await tx.membership.upsert({
        where: { tenantId_userId: { tenantId: createdTenant.id, userId: user.id } },
        create: {
          tenantId: createdTenant.id,
          userId: user.id,
          roles: { connect: { id: ownerRole.id } },
        },
        update: {},
      });

      return { tenant: createdTenant, isNew };
    });
    const { tenant, isNew } = created;

    // Pin the new tenant in Clerk publicMetadata so resolveContext's
    // orgId-less fallback resolves it deterministically on the FIRST dashboard
    // load — before Clerk's active-org session claim propagates. Without this
    // the first /dashboard render races Clerk's eventually-consistent org
    // claim, resolves empty permissions, and the sidebar renders blank until a
    // manual refresh. Best-effort; the org-claim path still works once it lands.
    try {
      const clerkMeta = await clerkClient();
      await clerkMeta.users.updateUserMetadata(identity.clerkUserId, {
        publicMetadata: { activeTenantId: tenant.id },
      });
    } catch (metaErr) {
      console.error('[v2:onboarding:workspace] set activeTenantId metadata failed', metaErr);
    }

    // Keep the Clerk org's own name in sync with the typed workspace name so a
    // later organization.updated webhook can't revert the tenant name back to
    // Clerk's auto-generated "{firstName}'s Organization". Best-effort; the DB
    // row is already authoritative.
    if (activeOrgId) {
      try {
        const clerk = await clerkClient();
        await clerk.organizations.updateOrganization(activeOrgId, { name: rawName });
      } catch (renameErr) {
        console.error('[v2:onboarding:workspace] clerk org rename failed', renameErr);
      }
    }

    // Best-effort welcome email — only on a brand-new tenant, in their locale.
    if (isNew) {
      try {
        await sendWelcomeEmail({
          to: identity.email,
          companyName: tenant.name,
          plan: tenant.plan,
          locale,
        });
      } catch (welcomeErr) {
        console.error('[v2:onboarding:workspace] welcome email failed', welcomeErr);
      }
    }

    return {
      ok: true,
      data: { tenantId: tenant.id, slug: tenant.slug },
      redirectTo: `/${locale}/onboarding/done`,
    };
  } catch (err) {
    console.error('[v2:onboarding:workspace] createWorkspaceAction failed', err);
    return { ok: false, formError: 'workspace_create_failed' };
  }
}
