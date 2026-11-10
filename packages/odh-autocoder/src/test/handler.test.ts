// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAutocoderHandler, DEFAULT_AUTOCODER_API_URL } from '$lib/server/handler.js';

const upstreamBody = {
	Industry: [{ Code: '622000', Title: 'General Medical and Surgical Hospitals', Score: 0.91 }],
	Occupation: [{ Code: '29-1141', Title: 'Registered Nurses', Score: 0.97 }],
	Scheme: 'NAICS 2017 and SOC 2018'
};

function upstream(body: unknown = upstreamBody, status = 200) {
	return vi.fn(
		async (_url: string, _init?: RequestInit) =>
			new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
	);
}

async function get(
	query: string,
	fetch: ReturnType<typeof upstream>,
	options: Partial<Parameters<typeof createAutocoderHandler>[0]> = {}
) {
	const handler = createAutocoderHandler({ apiKey: 'test-api-key', ...options });
	const url = new URL(`http://localhost/api/nio-autocoder${query}`);
	return handler({ request: new Request(url), url, fetch } as any);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('createAutocoderHandler: request mapping', () => {
	it('codes an occupation with the API key, through event.fetch', async () => {
		const fetch = upstream();
		await get('?o=nurse&c=0', fetch);

		expect(fetch).toHaveBeenCalledTimes(1);
		const [endpoint, init] = fetch.mock.calls[0];
		expect(endpoint).toBe(`${DEFAULT_AUTOCODER_API_URL}?n=6&o=nurse`);
		expect(init?.method).toBe('GET');
		expect((init?.headers as Record<string, string>)['Ocp-Apim-Subscription-Key']).toBe(
			'test-api-key'
		);
	});

	it('codes an industry', async () => {
		const fetch = upstream();
		await get('?i=hospital', fetch);
		expect(fetch.mock.calls[0][0]).toBe(`${DEFAULT_AUTOCODER_API_URL}?n=6&i=hospital`);
	});

	it('passes both occupation and industry when given', async () => {
		const fetch = upstream();
		await get('?o=nurse&i=hospital', fetch);
		expect(fetch.mock.calls[0][0]).toBe(`${DEFAULT_AUTOCODER_API_URL}?n=6&o=nurse&i=hospital`);
	});

	it('uses the configured API URL, result count and key getter', async () => {
		const fetch = upstream();
		await get('?o=nurse', fetch, {
			apiUrl: 'https://example.test/code',
			maxResults: 3,
			apiKey: () => 'key-from-env'
		});
		const [endpoint, init] = fetch.mock.calls[0];
		expect(endpoint).toBe('https://example.test/code?n=3&o=nurse');
		expect((init?.headers as Record<string, string>)['Ocp-Apim-Subscription-Key']).toBe(
			'key-from-env'
		);
	});
});

describe('createAutocoderHandler: response mapping', () => {
	it('returns the coding results', async () => {
		const response = await get('?o=nurse', upstream());
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(upstreamBody);
	});

	it('drops fields the UI does not use', async () => {
		const response = await get(
			'?o=nurse',
			upstream({
				...upstreamBody,
				Occupation: [{ Code: '29-1141', Title: 'Registered Nurses', Score: 0.97, Extra: 'x' }],
				Input: { o: 'nurse' },
				Diagnostics: 'internal'
			})
		);
		expect(await response.json()).toEqual(upstreamBody);
	});
});

describe('createAutocoderHandler: errors', () => {
	it('rejects a request without occupation or industry text', async () => {
		const fetch = upstream();
		const response = await get('?c=0', fetch);
		expect(response.status).toBe(400);
		expect(fetch).not.toHaveBeenCalled();
	});

	it('rejects with 403 when authorize returns false', async () => {
		const fetch = upstream();
		const response = await get('?o=nurse', fetch, { authorize: async () => false });
		expect(response.status).toBe(403);
		expect(fetch).not.toHaveBeenCalled();
	});

	it('proceeds when authorize returns true', async () => {
		const response = await get('?o=nurse', upstream(), { authorize: () => true });
		expect(response.status).toBe(200);
	});

	it('responds 503 without calling the API when no key is configured', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetch = upstream();
		const response = await get('?o=nurse', fetch, { apiKey: undefined });
		expect(response.status).toBe(503);
		expect(fetch).not.toHaveBeenCalled();
	});

	it.each([
		['an error status', upstream({ statusCode: 401, message: 'Access denied: invalid key' }, 401)],
		['invalid JSON', upstream('<html>gateway timeout</html>')],
		['an unexpected body', upstream({ message: 'nope' })],
		[
			'a network failure',
			vi.fn(async (_url: string, _init?: RequestInit): Promise<Response> => {
				throw new TypeError('fetch failed: connect ECONNREFUSED');
			})
		]
	])('responds with a generic 502 for %s', async (_, fetch) => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const response = await get('?o=nurse', fetch as ReturnType<typeof upstream>);
		expect(response.status).toBe(502);
		const text = await response.text();
		expect(JSON.parse(text)).toEqual({ message: 'Coding service unavailable' });
		expect(text).not.toMatch(/denied|gateway|nope|ECONNREFUSED/);
	});

	it('never logs request or response contents', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		await get('?o=secret-occupation', upstream());
		await get('?o=secret-occupation', upstream({ Occupation: 'secret-response' }, 500));
		const logged = JSON.stringify([log.mock.calls, error.mock.calls, warn.mock.calls]);
		expect(logged).not.toContain('secret');
		expect(logged).not.toContain('Registered Nurses');
	});
});
