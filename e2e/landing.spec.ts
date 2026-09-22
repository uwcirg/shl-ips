import { test, expect } from '@playwright/test';

test.describe('landing page', () => {
  test('loads the base content for an anonymous visitor', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Tell your health story')).toBeVisible();
    await expect(page.getByText(/An initiative by the University of Washington/i)).toBeVisible();
    await expect(page.getByText('Sign In')).toBeVisible();
  });
});
