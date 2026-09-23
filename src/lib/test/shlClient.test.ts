// Same jsdom/jose realm mismatch documented in managementClient.test.ts: TextEncoder output
// under jsdom isn't `instanceof` the Uint8Array jose's runtime checks expect. This file is
// fetch + jose with no DOM usage, so it runs under the plain Node environment instead.
// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import base64url from 'base64url';
import * as jose from 'jose';
import { Buffer } from 'buffer';
import {
  decodeBase64urlToJson,
  decodeToJson,
  flag,
  url,
  id,
  randomStringWithEntropy,
  retrieve
} from '$lib/utils/shlClient';

function encryptionKeyFor(keyString: string) {
  // Mirrors decodeBase64urlToJson/retrieve()'s own `Buffer.from(parsedShl.key, 'base64')` -
  // Node's 'base64' decoder tolerates the URL-safe alphabet, so this is the exact key bytes
  // retrieve() will derive from the same key string.
  return Buffer.from(keyString, 'base64');
}

function buildShl(overrides: Partial<{ url: string; key: string; flag: string; label: string }> = {}) {
  const keyString = base64url.encode(Buffer.from(new Uint8Array(32)));
  const parsedShl = {
    url: 'https://shl-server.example.com/manifest/shl-1',
    key: keyString,
    flag: 'P',
    label: 'Test Summary',
    ...overrides
  };
  const shl = 'shlink:/' + base64url.encode(JSON.stringify(parsedShl));
  return { shl, parsedShl, encryptionKey: encryptionKeyFor(parsedShl.key) };
}

async function encryptCompact(content: unknown, key: Buffer) {
  return new jose.CompactEncrypt(new TextEncoder().encode(JSON.stringify(content)))
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(key);
}

describe('decodeBase64urlToJson', () => {
  it('round-trips a JSON payload through base64', () => {
    const payload = { a: 1, b: 'two' };
    const encoded = base64url.encode(JSON.stringify(payload));

    expect(decodeBase64urlToJson(encoded)).toEqual(payload);
  });
});

describe('decodeToJson', () => {
  it('decodes a JSON payload from raw bytes', () => {
    const payload = { hello: 'world' };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));

    expect(decodeToJson(bytes)).toEqual(payload);
  });
});

describe('randomStringWithEntropy', () => {
  it('returns a base64url string that grows with entropy and varies across calls', () => {
    const short = randomStringWithEntropy(8);
    const long = randomStringWithEntropy(32);

    expect(short).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(long.length).toBeGreaterThan(short.length);
    expect(randomStringWithEntropy(16)).not.toBe(randomStringWithEntropy(16));
  });
});

describe('flag / url / id', () => {
  it('extracts the flag and url from a bare shlink', () => {
    const { shl, parsedShl } = buildShl();

    expect(flag({ shl })).toBe('P');
    expect(url({ shl })).toBe(parsedShl.url);
  });

  it('extracts the flag and url when the shlink has a viewer URL prefix', () => {
    const { parsedShl } = buildShl();
    const prefixed = 'https://viewer.example.com/ips#shlink:/' + base64url.encode(JSON.stringify(parsedShl));

    expect(flag({ shl: prefixed })).toBe('P');
    expect(url({ shl: prefixed })).toBe(parsedShl.url);
  });

  it('derives the manifest id from the last path segment of the url', () => {
    const { shl } = buildShl({ url: 'https://shl-server.example.com/manifest/shl-42' });

    expect(id({ shl })).toBe('shl-42');
  });
});

describe('retrieve', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the passcode and recipient, decrypts embedded files, and returns shcs/jsons/state', async () => {
    const { shl, parsedShl, encryptionKey } = buildShl();
    const shcContent = { verifiableCredential: ['vc-string-1'] };
    const jsonContent = { resourceType: 'Bundle', entry: [] };
    const manifest = {
      files: [
        { contentType: 'application/smart-health-card', embedded: await encryptCompact(shcContent, encryptionKey) },
        { contentType: 'application/fhir+json', embedded: await encryptCompact(jsonContent, encryptionKey) }
      ]
    };
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(manifest)) });

    const config = { shl, passcode: 'pw', recipient: 'jane' };
    const result: any = await retrieve(config);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [reqUrl, init] = fetchMock.mock.calls[0];
    expect(reqUrl).toBe(parsedShl.url);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'content-type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ passcode: 'pw', recipient: 'jane' });

    expect(result.shcs).toEqual(['vc-string-1']);
    expect(result.jsons).toEqual([jsonContent]);
    expect(JSON.parse(atob(result.state))).toEqual(config);
  });

  it('accepts a base64url-encoded state blob in place of a plain config', async () => {
    const { shl, parsedShl, encryptionKey } = buildShl();
    const manifest = {
      files: [
        { contentType: 'application/fhir+json', embedded: await encryptCompact({ ok: true }, encryptionKey) }
      ]
    };
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(manifest)) });

    const config = { shl, passcode: 'pw2', recipient: 'sam' };
    const state = base64url.encode(JSON.stringify(config));

    await retrieve({ state });

    const [reqUrl, init] = fetchMock.mock.calls[0];
    expect(reqUrl).toBe(parsedShl.url);
    expect(JSON.parse(init.body)).toEqual({ passcode: 'pw2', recipient: 'sam' });
  });

  it('returns the status and body text when the manifest response is not ok', async () => {
    const { shl } = buildShl();
    fetchMock.mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('Not Found') });

    const result = await retrieve({ shl, passcode: '', recipient: 'jane' });

    expect(result).toEqual({ status: 404, error: 'Not Found' });
  });

  it('returns an error when the manifest response is ok but not JSON', async () => {
    const { shl } = buildShl();
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('not json') });

    const result = await retrieve({ shl, passcode: '', recipient: 'jane' });

    expect(result).toEqual({ status: 200, error: 'not json' });
  });

  it('fetches non-embedded files from their location', async () => {
    const { shl, parsedShl, encryptionKey } = buildShl();
    const fileLocation = 'https://cdn.example.com/files/bundle.jwe';
    const jsonContent = { resourceType: 'Bundle', entry: [{ resource: { resourceType: 'Patient' } }] };
    const manifest = { files: [{ contentType: 'application/fhir+json', location: fileLocation }] };
    const encryptedFile = await encryptCompact(jsonContent, encryptionKey);

    fetchMock.mockImplementation((reqUrl: string) => {
      if (reqUrl === parsedShl.url) {
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(manifest)) });
      }
      if (reqUrl === fileLocation) {
        return Promise.resolve({ text: () => Promise.resolve(encryptedFile) });
      }
      throw new Error(`unexpected fetch to ${reqUrl}`);
    });

    const result: any = await retrieve({ shl, passcode: '', recipient: 'jane' });

    expect(fetchMock).toHaveBeenCalledWith(fileLocation);
    expect(result.jsons).toEqual([jsonContent]);
  });
});
