import { expect, test } from '@playwright/test';

test('Russian landing renders sign-in and sign-up CTAs', async ({ page }) => {
  await page.goto('/ru');
  await expect(page.getByRole('heading', { name: 'ishflow' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Войти' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Регистрация' })).toBeVisible();
});

test('English landing renders translated CTAs', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
});

test('Sign-in page renders Clerk widget', async ({ page }) => {
  await page.goto('/ru/sign-in');
  await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 15_000 });
});

test('Dashboard redirects unauthenticated users to sign-in', async ({ page }) => {
  await page.goto('/ru/dashboard');
  await expect(page).toHaveURL(/\/sign-in/);
});
