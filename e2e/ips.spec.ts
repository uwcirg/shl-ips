import { test, expect, type Page } from '@playwright/test';
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

  // No 'P' in the flag and a successful manifest response, so no passcode field is shown.
  const parsedShl = { url: manifestUrl, key: keyString, flag: '', label: 'Test Summary' };
  const shl = 'shlink:/' + base64url.encode(JSON.stringify(parsedShl));

  return { shl, manifestUrl, manifest };
}

// An anonymous visitor must say who they are before the first request is made.
async function identifyAsVisitor(page: Page, name = 'E2E Tester') {
  await page.getByLabel(/who are you/i).fill(name);
  await page.getByRole('button', { name: /continue/i }).click();
}

test.describe('/ips page', () => {
  test('loads a SHL from the server and renders the retrieved bundle', async ({ page }) => {
    const { shl, manifestUrl, manifest } = await buildManifest();

    const requestBodies: string[] = [];
    await page.route(manifestUrl, (route) => {
      requestBodies.push(route.request().postData() ?? '');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) });
    });

    await page.goto('/ips#' + shl);
    await identifyAsVisitor(page);

    await expect(page.getByText(/does not exist or has been deactivated/i)).not.toBeVisible();
    // The real Patient.svelte template renders the name more than once (e.g. a heading plus a
    // detail row) - this only needs to confirm the retrieved bundle made it to the viewer.
    await expect(page.getByText('Jane Doe').first()).toBeVisible();
    expect(requestBodies).toHaveLength(1);
    expect(JSON.parse(requestBodies[0]).recipient).toBe('E2E Tester');
  });

  test('shows an error message when the server reports the SHL cannot be found', async ({ page }) => {
    const { shl, manifestUrl } = await buildManifest();

    await page.route(manifestUrl, (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not Found' }) })
    );

    await page.goto('/ips#' + shl);
    await identifyAsVisitor(page);

    await expect(page.getByText(/does not exist or has been deactivated/i)).toBeVisible();
  });
});
