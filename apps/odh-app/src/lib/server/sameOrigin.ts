import type { RequestEvent } from '@sveltejs/kit';

/**
 * Whether a request came from this app's own pages. Keeps other sites from using the
 * autocoder endpoint (and its API key quota) from their pages. It is not authentication:
 * a non-browser client can send these headers itself.
 *
 * Browsers send Sec-Fetch-Site on every request; older ones fall back to Origin or Referer.
 */
export function isSameOrigin({ request, url }: Pick<RequestEvent, 'request' | 'url'>): boolean {
	const site = request.headers.get('sec-fetch-site');
	if (site) {
		return site === 'same-origin';
	}
	const source = request.headers.get('origin') ?? request.headers.get('referer');
	if (!source) {
		return false;
	}
	try {
		return new URL(source).origin === url.origin;
	} catch {
		return false;
	}
}
