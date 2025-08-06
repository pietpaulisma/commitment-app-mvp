import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Commitment App/);
});

test('dashboard loads', async ({ page }) => {
  await page.goto('/dashboard');

  // Check if the page loads without errors
  await expect(page.locator('body')).toBeVisible();
});