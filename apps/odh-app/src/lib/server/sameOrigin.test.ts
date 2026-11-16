import { describe, expect, it } from 'vitest';
import { isSameOrigin } from './sameOrigin';

const url = new URL('https://odh.example.org/api/nio-autocoder?o=nurse');

function event(headers: Record<string, string>) {
	return { request: new Request(url, { headers }), url };
}

describe('isSameOrigin', () => {
	it('accepts requests the browser marks same-origin', () => {
		expect(isSameOrigin(event({ 'sec-fetch-site': 'same-origin' }))).toBe(true);
	});

	it.each(['cross-site', 'same-site', 'none'])('rejects Sec-Fetch-Site: %s', (site) => {
		expect(isSameOrigin(event({ 'sec-fetch-site': site }))).toBe(false);
	});

	it('trusts Sec-Fetch-Site over a matching Referer', () => {
		expect(
			isSameOrigin(event({ 'sec-fetch-site': 'cross-site', referer: 'https://odh.example.org/' }))
		).toBe(false);
	});

	it('falls back to Origin or Referer', () => {
		expect(isSameOrigin(event({ origin: 'https://odh.example.org' }))).toBe(true);
		expect(isSameOrigin(event({ referer: 'https://odh.example.org/form' }))).toBe(true);
		expect(isSameOrigin(event({ origin: 'https://evil.example' }))).toBe(false);
		expect(isSameOrigin(event({ referer: 'http://odh.example.org/' }))).toBe(false);
	});

	it('rejects requests with no indication of where they came from', () => {
		expect(isSameOrigin(event({}))).toBe(false);
		expect(isSameOrigin(event({ referer: 'not a url' }))).toBe(false);
	});
});
