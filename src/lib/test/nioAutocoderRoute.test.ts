import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/config', () => ({ AUTOCODER_API_KEY: 'test-api-key' }));

import { GET } from '../../routes/(common)/api/nio-autocoder/+server';

// Characterization tests for /api/nio-autocoder: how a request maps onto the NIOSH autocoder
// call, and what comes back to the browser. The upstream API is mocked.

const UPSTREAM = 'https://apistg.cdc.gov/nioautocoder/1.1.0/code';

const upstreamBody = {
  Industry: [{ Code: '622000', Title: 'General Medical and Surgical Hospitals', Score: 0.91 }],
  Occupation: [{ Code: '29-1141', Title: 'Registered Nurses', Score: 0.97 }],
  Scheme: 'NAICS 2017 and SOC 2018'
};

function mockFetch(body: unknown = upstreamBody) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
  // The route currently calls the global fetch; after extraction it uses event.fetch. Supplying
  // the same mock both ways keeps these tests valid across the change.
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

async function get(query: string, fetch: ReturnType<typeof mockFetch>) {
  const url = new URL(`http://localhost/api/nio-autocoder${query}`);
  return GET({ request: new Request(url), url, fetch } as any);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('/api/nio-autocoder', () => {
  it('codes an occupation with the confidential API key', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetch = mockFetch();
    const response = await get('?o=nurse&c=0', fetch);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe(`${UPSTREAM}?n=6&o=nurse`);
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>)['Ocp-Apim-Subscription-Key']).toBe('test-api-key');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(upstreamBody);
  });

  it('codes an industry', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetch = mockFetch();
    await get('?i=hospital&c=0', fetch);
    expect(fetch.mock.calls[0][0]).toBe(`${UPSTREAM}?n=6&i=hospital`);
  });

  it('passes both occupation and industry when given', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetch = mockFetch();
    await get('?o=nurse&i=hospital', fetch);
    expect(fetch.mock.calls[0][0]).toBe(`${UPSTREAM}?n=6&o=nurse&i=hospital`);
  });
});
