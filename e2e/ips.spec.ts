import { test, expect } from '@playwright/test';
import base64url from 'base64url';
import * as jose from 'jose';
import { Buffer } from 'buffer';

// Builds a real, decryptable SHL manifest so this test exercises the actual retrieve/decrypt
// pipeline (shlClient.ts + jose) in a real browser, not a mocked one - the network hop to the
// SHL server is the only thing stubbed, via Playwright's route interception.
async function buildManifest() {
  const keyString = base64url.encode(Buffer.from(new Uint8Array(32)));
  const encryptionKey = Buffer.from(keyString, 'base64');
  const manifestUrl = 'https://shl-server.example.com/api/manifest/e2e-test';

  const bundle = {
    resourceType: 'Bundle',
    type: 'document',
    entry: [
      { resource: { resourceType: 'Composition', status: 'final', date: '2024-01-01', section: [] } },
      { resource: { resourceType: 'Patient', name: [{ given: ['Jane'], family: 'Doe' }] } }
    ]
  };

  const embedded = await new jose.CompactEncrypt(new TextEncoder().encode(JSON.stringify(bundle)))
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(encryptionKey);

  const manifest = { files: [{ contentType: 'application/fhir+json', embedded }] };

  // No 'P' in the flag: the page's passcode-prompt branch only fires for a flagged link, and
  // a real `prompt()` dialog would otherwise block the page in a headless browser.
  const parsedShl = { url: manifestUrl, key: keyString, flag: '', label: 'Test Summary' };
  const shl = 'shlink:/' + base64url.encode(JSON.stringify(parsedShl));

  return { shl, manifestUrl, manifest };
}

function logBrowserErrors(page: import('@playwright/test').Page) {
  // Temporary diagnostics: see landing.spec.ts for why this matters here specifically.
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[console.error]', msg.text());
  });
}

test.describe('/ips page', () => {
  test('loads a SHL from the server and renders the retrieved bundle', async ({ page }) => {
    logBrowserErrors(page);
    const { shl, manifestUrl, manifest } = await buildManifest();

    // The page makes two POSTs to this URL: an initial passcode-probe, then shlClient.retrieve()'s
    // own manifest fetch. Both are satisfied by the same successful response.
    await page.route(manifestUrl, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) })
    );

    await page.goto('/ips#' + shl);

    await expect(page.getByText(/does not exist or has been deactivated/i)).not.toBeVisible();
    await expect(page.getByText('Jane Doe')).toBeVisible();
  });

  test('shows an error message when the server reports the SHL cannot be found', async ({ page }) => {
    logBrowserErrors(page);
    const { shl, manifestUrl } = await buildManifest();

    await page.route(manifestUrl, (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not Found' }) })
    );

    await page.goto('/ips#' + shl);

    await expect(page.getByText(/does not exist or has been deactivated/i)).toBeVisible();
  });
});
