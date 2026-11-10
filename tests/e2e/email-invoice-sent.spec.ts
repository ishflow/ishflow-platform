import { expect, test } from '@playwright/test';

/**
 * Email notifications: explicit "Send email" button on a posted sales invoice.
 *
 * TODO: Requires Clerk authenticated test fixtures (storageState for an admin
 * member of the demo tenant) plus a Resend HTTPS interception strategy.
 * Skipped until role-based-ui fixtures land.
 */
test.describe.skip('Email notifications: invoice send', () => {
  test('admin can trigger send-email on a posted sales invoice', async ({ page }) => {
    await page.goto('/en/documents/sales.invoice');
    // Find a POSTED invoice row and click into the detail page.
    const postedRow = page
      .getByRole('row')
      .filter({ hasText: /Posted/i })
      .first();
    await postedRow.getByRole('link').first().click();

    // The send-email button is rendered next to the downloads menu when the
    // current user has `sales.invoice:send_email`.
    const sendBtn = page.getByRole('button', { name: /send email/i });
    await expect(sendBtn).toBeVisible();
    await sendBtn.click();

    // Toast confirms dispatch (Resend mocked in test mode).
    await expect(page.getByText(/invoice email sent/i)).toBeVisible();
  });
});
