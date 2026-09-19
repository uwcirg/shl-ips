import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writable } from 'svelte/store';
import * as jose from 'jose';
import { SHLClient } from '$lib/utils/managementClient';
import { fakeAuth, fakeShl } from '$lib/test/mocks';

vi.mock('$lib/config/config', () => ({
  API_BASE: 'https://api.example.com',
  VIEWER_BASE: 'https://viewer.example.com/ips#'
}));

const { getUserShlsMock } = vi.hoisted(() => ({
  getUserShlsMock: vi.fn()
}));

vi.mock('$lib/utils/shlServerUtils', () => ({
  getUserShls: getUserShlsMock
}));

function jsonHeaders() {
  return {
    get: (name: string) => {
      if (name === 'Content-Length') return '2';
      if (name === 'Content-Type') return 'application/json';
      return null;
    }
  };
}

function emptyHeaders() {
  return { get: () => null };
}

describe('SHLClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    getUserShlsMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('getSHLUrl', () => {
    it('builds the management URL from the SHL id', () => {
      const client = new SHLClient(fakeAuth());

      expect(client.getSHLUrl(fakeShl({ id: 'abc123' }))).toBe(
        'https://api.example.com/shl/abc123'
      );
    });
  });

  describe('toLink', () => {
    it('encodes the SHL url, flag, exp, and key into a shlink: payload', async () => {
      const client = new SHLClient(fakeAuth());
      const shl = fakeShl({ id: 'abc123', flag: 'LP', exp: 1234 });

      const link = await client.toLink(shl);

      expect(link.startsWith('https://viewer.example.com/ips#shlink:/')).toBe(true);
      const encoded = link.substring(link.indexOf('shlink:/') + 'shlink:/'.length);
      const decoded = JSON.parse(
        new TextDecoder().decode(jose.base64url.decode(encoded))
      );
      expect(decoded).toEqual({
        url: 'https://api.example.com/shl/abc123',
        exp: 1234,
        flag: 'LP',
        key: shl.key
      });
    });

    it('defaults flag to "P" and omits exp when not provided', async () => {
      const client = new SHLClient(fakeAuth());
      const shl = fakeShl({ id: 'abc123', flag: undefined, exp: undefined });

      const link = await client.toLink(shl);

      const encoded = link.substring(link.indexOf('shlink:/') + 'shlink:/'.length);
      const decoded = JSON.parse(
        new TextDecoder().decode(jose.base64url.decode(encoded))
      );
      expect(decoded.flag).toBe('P');
      expect(decoded).not.toHaveProperty('exp');
    });
  });

  describe('getUserShls', () => {
    it('fetches the current user id and token, delegating to getUserShls', async () => {
      const auth = fakeAuth({ userId: writable('user-42') } as any);
      const client = new SHLClient(auth);
      const shls = [fakeShl()];
      getUserShlsMock.mockResolvedValue(shls);

      const result = await client.getUserShls();

      expect(getUserShlsMock).toHaveBeenCalledWith(
        'https://api.example.com',
        'access-token-1',
        'user-42'
      );
      expect(result).toBe(shls);
    });
  });

  describe('createShl', () => {
    it('posts the config and decodes the returned shlink into an SHLAdminParams', async () => {
      const client = new SHLClient(fakeAuth());
      const shl = fakeShl({ id: 'new-shl' });
      const encodedPayload = jose.base64url.encode(JSON.stringify(shl));
      fetchMock.mockResolvedValue({ text: vi.fn().mockResolvedValue(`shlink:/${encodedPayload}`) });

      const config = { label: 'My Summary', passcode: '1234' };
      const result = await client.createShl(config);

      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/shl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer access-token-1'
        },
        body: JSON.stringify(config)
      });
      expect(result).toEqual(shl);
    });
  });

  describe('deleteShl', () => {
    it('sends a DELETE and returns the parsed response', async () => {
      const client = new SHLClient(fakeAuth());
      const remaining = [fakeShl({ id: 'other' })];
      fetchMock.mockResolvedValue({ json: vi.fn().mockResolvedValue(remaining) });

      const shl = fakeShl({ id: 'to-delete' });
      const result = await client.deleteShl(shl);

      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/shl/to-delete', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer access-token-1' }
      });
      expect(result).toEqual(remaining);
    });
  });

  describe('resetShl', () => {
    it('sends a PUT with the mutable SHL fields', async () => {
      const client = new SHLClient(fakeAuth());
      fetchMock.mockResolvedValue({ json: vi.fn().mockResolvedValue(true) });

      const shl = fakeShl({ id: 'to-reset', passcode: 'pw', exp: 999, label: 'Label' });
      const result = await client.resetShl(shl);

      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/shl/to-reset', {
        method: 'PUT',
        body: JSON.stringify({ passcode: 'pw', exp: 999, label: 'Label' }),
        headers: { Authorization: 'Bearer access-token-1' }
      });
      expect(result).toBe(true);
    });
  });

  describe('isActive', () => {
    it('returns the boolean body when the SHL is active', async () => {
      const client = new SHLClient(fakeAuth());
      fetchMock.mockResolvedValue({
        ok: true,
        headers: jsonHeaders(),
        json: vi.fn().mockResolvedValue(true)
      });

      const result = await client.isActive('shl-1');

      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/shl/shl-1/active', {
        method: 'GET'
      });
      expect(result).toBe(true);
    });

    it('returns false when the response has no body', async () => {
      const client = new SHLClient(fakeAuth());
      fetchMock.mockResolvedValue({ ok: true, headers: emptyHeaders() });

      const result = await client.isActive('shl-1');

      expect(result).toBe(false);
    });

    it('returns false for a 404 with no message', async () => {
      const client = new SHLClient(fakeAuth());
      fetchMock.mockResolvedValue({ ok: false, status: 404, headers: emptyHeaders() });

      const result = await client.isActive('shl-1');

      expect(result).toBe(false);
    });

    it('throws when a 404 reports the SHL was deleted', async () => {
      const client = new SHLClient(fakeAuth());
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        headers: jsonHeaders(),
        json: vi.fn().mockResolvedValue({ message: 'Deleted' })
      });

      await expect(client.isActive('shl-1')).rejects.toThrow('Deleted');
    });

    it('returns false for a non-404 error status', async () => {
      const client = new SHLClient(fakeAuth());
      fetchMock.mockResolvedValue({ ok: false, status: 500, headers: emptyHeaders() });

      const result = await client.isActive('shl-1');

      expect(result).toBe(false);
    });
  });

  describe('reactivate', () => {
    it('sends a PUT and returns the parsed response', async () => {
      const client = new SHLClient(fakeAuth());
      fetchMock.mockResolvedValue({ json: vi.fn().mockResolvedValue(true) });

      const result = await client.reactivate(fakeShl({ id: 'shl-1' }));

      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/shl/shl-1/reactivate', {
        method: 'PUT',
        headers: { Authorization: 'Bearer access-token-1' }
      });
      expect(result).toBe(true);
    });
  });

  describe('addFile', () => {
    it('encrypts the content with the SHL key and posts it', async () => {
      const client = new SHLClient(fakeAuth());
      const shl = fakeShl({ id: 'shl-1' });
      const updated = { ...shl };
      fetchMock.mockResolvedValue({ json: vi.fn().mockResolvedValue(updated) });

      const content = { resourceType: 'Bundle', entry: [] };
      const result = await client.addFile(shl, content, 'jane', 'application/fhir+json');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.example.com/shl/shl-1/file');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({
        'Content-Type': 'application/fhir+json',
        Authorization: 'Bearer access-token-1'
      });

      const { plaintext } = await jose.compactDecrypt(
        init.body,
        jose.base64url.decode(shl.key)
      );
      expect(JSON.parse(new TextDecoder().decode(plaintext))).toEqual(content);
      expect(result).toEqual(updated);
    });
  });

  describe('deleteFile', () => {
    it('sends a DELETE with the content hash as the body', async () => {
      const client = new SHLClient(fakeAuth());
      const updated = fakeShl({ id: 'shl-1', files: [] });
      fetchMock.mockResolvedValue({ json: vi.fn().mockResolvedValue(updated) });

      const result = await client.deleteFile(fakeShl({ id: 'shl-1' }), 'hash-1');

      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/shl/shl-1/file', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer access-token-1' },
        body: 'hash-1'
      });
      expect(result).toEqual(updated);
    });
  });
});
