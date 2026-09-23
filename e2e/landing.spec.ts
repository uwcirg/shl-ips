import { test, expect } from '@playwright/test';

test.describe('landing page', () => {
  test('loads the base content for an anonymous visitor', async ({ page }) => {
    // Temporary diagnostics: the app is CSR-only, so a JS error during the real root layout's
    // mount (constructing AuthService/FHIRDataService for real, unlike the mocked component
    // tests) would leave the page blank with no other signal. Surface it instead of guessing.
    page.on('pageerror', (err) => console.log('[pageerror]', err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[console.error]', msg.text());
    });

    await page.goto('/');

    await expect(page.getByText('Tell your health story')).toBeVisible();
    await expect(page.getByText(/An initiative by the University of Washington/i)).toBeVisible();
    await expect(page.getByText('Sign In')).toBeVisible();
  });
});
