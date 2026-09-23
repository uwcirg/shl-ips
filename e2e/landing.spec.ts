import { test, expect } from '@playwright/test';

test.describe('landing page', () => {
  test('loads the base content for an anonymous visitor', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Tell your health story')).toBeVisible();
    await expect(page.getByText(/An initiative by the University of Washington/i)).toBeVisible();
    // Both the header nav link and the page's own CTA say "Sign In" - the CTA button is the one
    // that's actually conditional on auth state, so it's the meaningful assertion here.
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});
