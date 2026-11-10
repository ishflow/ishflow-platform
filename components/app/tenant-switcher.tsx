'use client';

import { OrganizationSwitcher } from '@clerk/nextjs';

/**
 * Org switcher with Clerk's built-in Manage modal suppressed so org-level
 * settings (profile, leave, delete, members) live in one place only:
 * `/admin/members` for members and `/settings/*` for org profile + danger
 * zone. The middleware also redirects `/organization-profile/*` deep-links
 * to `/settings/organization` as a belt-and-suspenders fallback in case
 * Clerk renames the `appearance.elements` selector key.
 */
export function TenantSwitcher() {
  return (
    <OrganizationSwitcher
      hidePersonal
      afterCreateOrganizationUrl="/dashboard"
      afterLeaveOrganizationUrl="/dashboard"
      afterSelectOrganizationUrl="/dashboard"
      appearance={{
        elements: {
          organizationSwitcherPopoverActionButton__manageOrganization: {
            display: 'none',
          },
        },
      }}
    />
  );
}
