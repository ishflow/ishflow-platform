import { expect, test } from '@playwright/test';

/**
 * Smoke + design-doc tests for the pending-invite flow.
 *
 * Live coverage:
 * - The /admin/members route exists and redirects unauthenticated visitors
 *   to sign-in.
 *
 * Deferred (test.fixme — awaiting auth fixture, see S2164 in claude-mem):
 * - Owner signs in → opens invite dialog → selects role=sales + types email
 *   → submits → pending row visible with role badge + email
 * - Owner clicks Cancel on the pending row → confirms → row disappears
 *
 * Full unit-level coverage:
 * - components/app/invite-member-dialog.test.tsx
 * - app/[locale]/(platform)/admin/members/actions.test.ts
 */

test.describe('Pending invite flow', () => {
  test('unauthenticated /en/admin/members redirects to sign-in', async ({ page }) => {
    await page.goto('/en/admin/members');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test.fixme(
    'owner can invite a member with a chosen role and see a pending row',
    async ({ page }) => {
      // Requires authenticated owner fixture (storageState).
      // 1. Navigate to /en/admin/members
      // 2. Click "Invite member" → dialog opens
      // 3. Fill email + select role "Sales manager"
      // 4. Submit → assert toast / inline "Invitation sent"
      // 5. Assert pending row visible with email and "Sales manager" badge
      await page.goto('/en/admin/members');
    },
  );

  test.fixme('owner can cancel a pending invite', async ({ page }) => {
    // Requires authenticated owner fixture.
    // 1. Navigate to /en/admin/members with a pending invite present
    // 2. Click "Cancel invite" on the row → confirm dialog
    // 3. Click "Cancel invitation" → row disappears
    await page.goto('/en/admin/members');
  });
});
