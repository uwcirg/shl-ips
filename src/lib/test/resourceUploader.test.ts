import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  uploadResources,
  uploadBundleEntries,
  getPatientReferenceFromTransactionResponse,
  generateIpsUrlFromPatientReference,
  uploadResourcesAndGetReference
} from '$lib/utils/resourceUploader';

// vi.mock factories are hoisted above this file's own top-level const declarations, so BASE
// must come from vi.hoisted() rather than a plain const, or the factory below sees it in its
// temporal dead zone ("Cannot access 'BASE' before initialization").
const { BASE } = vi.hoisted(() => ({ BASE: 'https://fhir.example.com' }));

vi.mock('$lib/config/config', () => ({
  INTERMEDIATE_FHIR_SERVER_BASE: BASE
}));

function textResponse(body: string, opts: { ok?: boolean } = {}) {
  return { ok: opts.ok ?? true, text: vi.fn().mockResolvedValue(body) };
}

describe('resourceUploader', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('uploadResources', () => {
    it('wraps each resource in a transaction Bundle entry and posts it', async () => {
      fetchMock.mockResolvedValue(textResponse(JSON.stringify({ resourceType: 'Bundle', entry: [] })));

      const resources = [
        { resourceType: 'Patient', id: 'p1' },
        { resourceType: 'Observation', id: 'o1' }
      ];

      const result = await uploadResources(resources, 'token-1');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(BASE);
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({
        'Content-Type': 'application/json+fhir',
        Authorization: 'Bearer token-1'
      });

      const sentBundle = JSON.parse(init.body);
      expect(sentBundle).toEqual({
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          { request: { method: 'POST', url: 'Patient' }, resource: resources[0] },
          { request: { method: 'POST', url: 'Observation' }, resource: resources[1] }
        ]
      });
      expect(result).toEqual({ resourceType: 'Bundle', entry: [] });
    });

    it('omits the Authorization header when no token is given', async () => {
      fetchMock.mockResolvedValue(textResponse(JSON.stringify({ resourceType: 'Bundle', entry: [] })));

      await uploadResources([{ resourceType: 'Patient', id: 'p1' }]);

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers).toEqual({ 'Content-Type': 'application/json+fhir' });
    });
  });

  describe('uploadBundleEntries', () => {
    it('preserves each entry\'s fullUrl in the transaction Bundle', async () => {
      fetchMock.mockResolvedValue(textResponse(JSON.stringify({ resourceType: 'Bundle', entry: [] })));

      const entries = [
        { resource: { resourceType: 'Patient', id: 'p1' }, fullUrl: 'urn:uuid:p1' },
        { resource: { resourceType: 'Observation', id: 'o1' }, fullUrl: 'urn:uuid:o1' }
      ];

      await uploadBundleEntries(entries, 'token-1');

      const sentBundle = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(sentBundle.entry).toEqual([
        { request: { method: 'POST', url: 'Patient' }, fullUrl: 'urn:uuid:p1', resource: entries[0].resource },
        { request: { method: 'POST', url: 'Observation' }, fullUrl: 'urn:uuid:o1', resource: entries[1].resource }
      ]);
    });

    it('returns the parsed response body on success', async () => {
      const transactionResponse = { resourceType: 'Bundle', entry: [{ response: { location: 'Patient/1/_history/1' } }] };
      fetchMock.mockResolvedValue(textResponse(JSON.stringify(transactionResponse)));

      const result = await uploadBundleEntries([]);

      expect(result).toEqual(transactionResponse);
    });

    it('logs each outcome diagnostic on a failed transaction', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failedBody = {
        resourceType: 'Bundle',
        entry: [
          { response: { outcome: { issue: [{ diagnostics: 'first problem' }] } } },
          { response: { outcome: { issue: [{ diagnostics: 'second problem' }] } } }
        ]
      };
      fetchMock.mockResolvedValue(textResponse(JSON.stringify(failedBody), { ok: false }));

      const result = await uploadBundleEntries([]);

      expect(errorSpy).toHaveBeenNthCalledWith(1, 'first problem');
      expect(errorSpy).toHaveBeenNthCalledWith(2, 'second problem');
      expect(result).toEqual(failedBody);
      errorSpy.mockRestore();
    });

    it('resolves without throwing when a failed transaction returns a non-JSON body', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      fetchMock.mockResolvedValue(textResponse('<html>502 Bad Gateway</html>', { ok: false }));

      const result = await uploadBundleEntries([]);

      expect(result).toBeUndefined();
      logSpy.mockRestore();
    });

    it('resolves to undefined when a successful response is not valid JSON', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      fetchMock.mockResolvedValue(textResponse('not json', { ok: true }));

      const result = await uploadBundleEntries([]);

      expect(result).toBeUndefined();
      logSpy.mockRestore();
    });
  });

  describe('getPatientReferenceFromTransactionResponse', () => {
    it('finds the created Patient location and strips the _history suffix', () => {
      const transactionResponse = {
        entry: [
          { response: { location: 'Observation/o1/_history/1' } },
          { response: { location: 'Patient/p1/_history/1' } }
        ]
      };

      expect(getPatientReferenceFromTransactionResponse(transactionResponse)).toBe('Patient/p1');
    });

    it('throws a descriptive error when no entry in the transaction created a Patient', () => {
      const transactionResponse = { entry: [{ response: { location: 'Observation/o1/_history/1' } }] };

      expect(() => getPatientReferenceFromTransactionResponse(transactionResponse)).toThrow(
        /No created Patient found/
      );
    });
  });

  describe('generateIpsUrlFromPatientReference', () => {
    it('builds a $summary URL for the patient reference', () => {
      expect(generateIpsUrlFromPatientReference('Patient/p1')).toBe(`${BASE}/Patient/p1/$summary`);
    });
  });

  describe('uploadResourcesAndGetReference', () => {
    it('uploads, extracts the new Patient reference, and builds its IPS summary URL', async () => {
      const transactionResponse = {
        resourceType: 'Bundle',
        entry: [{ response: { location: 'Patient/new-1/_history/1' } }]
      };
      fetchMock.mockResolvedValue(textResponse(JSON.stringify(transactionResponse)));

      const result = await uploadResourcesAndGetReference([
        { resource: { resourceType: 'Patient', id: 'new-1' }, fullUrl: 'urn:uuid:new-1' }
      ]);

      expect(result).toBe(`${BASE}/Patient/new-1/$summary`);
    });
  });
});
