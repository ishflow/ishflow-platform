import { expect, test } from '@playwright/test';

/**
 * Smoke + design-doc tests for the invite-accept → role assignment flow.
 *
 * Live coverage:
 * - The /sign-in route accepts an invitation token query parameter and
 *   renders the Clerk widget without crashing.
 *
 * Deferred (test.fixme — awaiting Clerk test-mode fixture, see S2164):
 * - Invitee opens invitation link → signs in → lands in org with the role
 *   chosen at invite time (e.g. "sales"), NOT viewer.
 *
 * Full unit-level coverage (the role-from-publicMetadata logic):
 * - platform/auth/clerk-sync.test.ts:
 *   - assigns role from invitation publicMetadata.systemRole (accepted)
 *   - falls back to viewer when no matching invitation exists
 *   - retries invitation lookup once after 500ms before falling back
 *   - never auto-grants owner via invitation publicMetadata
 *   - syncMissingMembership picks role from invitation publicMetadata
 */

test.describe('Invite accept → role assignment', () => {
  test('/en/sign-in?__clerk_ticket=test renders without crashing', async ({ page }) => {
    const response = await page.goto('/en/sign-in?__clerk_ticket=test-ticket');
    expect(response?.status()).toBeLessThan(500);
    // Just confirm we landed somewhere under /sign-in (Clerk may rewrite).
    await expect(page).toHaveURL(/sign-in/);
  });

  test.fixme('invitee accepting invitation lands with the chosen role', async () => {
    // Requires Clerk test-mode + invitee storageState fixture.
    // 1. Owner (separate context) sends invite to invitee@test with role=sales
    // 2. Invitee opens the Clerk invitation link
    // 3. Invitee completes sign-in
    // 4. Navigate to /en/dashboard
    // 5. Open user menu / "My role" / similar surface; assert displayed role is
    //    "Sales manager" — NOT "Viewer"
  });

  test.fixme('invitation with owner systemRole falls back to viewer (no auto-owner)', async () => {
    // Requires Clerk test-mode + ability to set publicMetadata.systemRole=owner.
    // The clerk-sync handler must refuse to auto-grant owner via invitation.
    // Assertion: invitee membership has role "viewer", not "owner".
  });
});
