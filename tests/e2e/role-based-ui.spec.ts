import { expect, test } from '@playwright/test';

/**
 * Role-based UI adaptation e2e specs.
 *
 * TODO: These require Clerk authenticated test fixtures (storageState per role).
 * Until fixtures are available, all specs are skipped.
 */

test.describe.skip('Role-based UI', () => {
  test('owner sees all sidebar items and dashboard widgets', async ({ page }) => {
    await page.goto('/en/dashboard');
    // Sidebar: catalogs, documents, registers, reports, admin
    await expect(page.getByText('Catalogs')).toBeVisible();
    await expect(page.getByText('Documents')).toBeVisible();
    await expect(page.getByText('Registers')).toBeVisible();
    await expect(page.getByText('Reports')).toBeVisible();
    await expect(page.getByText('Admin')).toBeVisible();
    // Dashboard: hero KPIs visible
    await expect(page.getByText('Receivables')).toBeVisible();
    await expect(page.getByText('Payables')).toBeVisible();
    await expect(page.getByText('This month sales')).toBeVisible();
    await expect(page.getByText('Open invoices')).toBeVisible();
    await expect(page.getByText('Stock value')).toBeVisible();
  });

  test('sales rep sees only own customers and limited FAB', async ({ page }) => {
    await page.goto('/en/catalogs/sales.customer');
    // Scope applies: only customers where assignedRepId = current user
    // TODO: verify customer list is scoped once auth fixtures exist
    await expect(page.getByText('Customers')).toBeVisible();

    // FAB / quick actions: no purchase invoice
    await page.goto('/en/dashboard');
    await expect(page.getByText('+ Sales invoice')).toBeVisible();
    await expect(page.getByText('+ Payment received')).toBeVisible();
    await expect(page.getByText('+ Purchase invoice')).not.toBeVisible();
    await expect(page.getByText('+ Payment sent')).not.toBeVisible();
  });

  test('warehouse sees no money KPIs and redacted product detail', async ({ page }) => {
    await page.goto('/en/dashboard');
    // No financial KPIs
    await expect(page.getByText('Receivables')).not.toBeVisible();
    await expect(page.getByText('Payables')).not.toBeVisible();
    await expect(page.getByText('This month sales')).not.toBeVisible();
    await expect(page.getByText('Open invoices')).not.toBeVisible();
    // Stock KPI visible
    await expect(page.getByText('Stock value')).toBeVisible();

    // Product detail: no unitPrice
    await page.goto('/en/catalogs/inventory.product');
    // TODO: open first product and assert unitPrice field is absent/redacted
  });

  test('viewer has no + New buttons anywhere', async ({ page }) => {
    await page.goto('/en/dashboard');
    await expect(page.getByText('+ Sales invoice')).not.toBeVisible();
    await expect(page.getByText('+ Payment received')).not.toBeVisible();
    await expect(page.getByText('+ Purchase invoice')).not.toBeVisible();
    await expect(page.getByText('+ Payment sent')).not.toBeVisible();
    await expect(page.getByText('+ Stock movement')).not.toBeVisible();

    await page.goto('/en/catalogs/inventory.product');
    await expect(page.getByRole('button', { name: /New/i })).not.toBeVisible();
  });
});
