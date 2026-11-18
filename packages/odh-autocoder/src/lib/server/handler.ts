import { json, type RequestEvent, type RequestHandler } from '@sveltejs/kit';
import type { AutocoderResponse, IOResponse } from '../types.js';

/** NIOSH Industry and Occupation autocoder, staging instance */
export const DEFAULT_AUTOCODER_API_URL = 'https://apistg.cdc.gov/nioautocoder/1.1.0/code';

export interface AutocoderHandlerOptions {
	/**
	 * Subscription key for the autocoder API (sent as Ocp-Apim-Subscription-Key). Pass a
	 * function to read it per request, e.g. from $env/dynamic/private.
	 */
	apiKey: string | undefined | (() => string | undefined);
	/** Autocoder API endpoint. Defaults to DEFAULT_AUTOCODER_API_URL. */
	apiUrl?: string;
	/** Number of suggestions to request (the API's n parameter). Defaults to 6. */
	maxResults?: number;
	/**
	 * Access check run before anything else. Return false to reject with 403. Leave unset when
	 * the app already protects the route (e.g. in hooks.server.ts).
	 */
	authorize?: (event: RequestEvent) => boolean | Promise<boolean>;
}

const UNAVAILABLE = 'Coding service unavailable';

function failure(status: number, message: string) {
	return json({ message }, { status });
}

function pickCodes(list: unknown): IOResponse[] | undefined {
	if (!Array.isArray(list)) {
		return undefined;
	}
	return list
		.filter((item) => item !== null && typeof item === 'object')
		.map(({ Code, Title, Score }) => ({ Code, Title, Score }));
}

/** Keeps only what the review UI uses; undefined if the response isn't a coding result */
function toAutocoderResponse(content: any): Partial<AutocoderResponse> | undefined {
	if (content === null || typeof content !== 'object') {
		return undefined;
	}
	const Industry = pickCodes(content.Industry);
	const Occupation = pickCodes(content.Occupation);
	if (!Industry && !Occupation) {
		return undefined;
	}
	return {
		...(Industry ? { Industry } : {}),
		...(Occupation ? { Occupation } : {}),
		...(typeof content.Scheme === 'string' ? { Scheme: content.Scheme } : {})
	};
}

/** Type and top-level keys of a response, without any values, so it's safe to log */
function describeShape(content: unknown): string {
	if (Array.isArray(content)) {
		return `array(${content.length})`;
	}
	if (content === null || typeof content !== 'object') {
		return content === null ? 'null' : typeof content;
	}
	const fields = Object.entries(content).map(
		([key, value]) =>
			`${key}: ${Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value}`
	);
	return `{ ${fields.join(', ')} }`;
}

/**
 * Creates a GET handler that codes free-text occupation (?o=) and/or industry (?i=) with the
 * NIOSH autocoder, keeping the API key on the server. Mount it in a +server.ts:
 *
 *   export const GET = createAutocoderHandler({ apiKey: env.AUTOCODER_API_KEY });
 *
 * Responds with { Industry?, Occupation?, Scheme? }, 400 without o or i, 403 when authorize
 * rejects, 503 without an API key, and 502 when the autocoder fails. Request and response
 * contents are never logged: occupation text can be sensitive.
 */
export function createAutocoderHandler(options: AutocoderHandlerOptions): RequestHandler {
	const apiUrl = options.apiUrl ?? DEFAULT_AUTOCODER_API_URL;
	const maxResults = options.maxResults ?? 6;

	return async (event) => {
		if (options.authorize && !(await options.authorize(event))) {
			return failure(403, 'Forbidden');
		}

		const occupation = event.url.searchParams.get('o');
		const industry = event.url.searchParams.get('i');
		if (!occupation && !industry) {
			return failure(400, 'Provide occupation (o) or industry (i) text to code');
		}

		const apiKey = typeof options.apiKey === 'function' ? options.apiKey() : options.apiKey;
		if (!apiKey) {
			console.error('odh-autocoder: no autocoder API key configured');
			return failure(503, UNAVAILABLE);
		}

		const endpoint = `${apiUrl}?n=${maxResults}${
			occupation ? '&o=' + encodeURIComponent(occupation) : ''
		}${industry ? '&i=' + encodeURIComponent(industry) : ''}`;

		let response: Response;
		try {
			response = await fetch(endpoint, {
				method: 'GET',
				headers: {
					'Ocp-Apim-Subscription-Key': apiKey
				}
			});
		} catch {
			console.error('odh-autocoder: autocoder request failed');
			return failure(502, UNAVAILABLE);
		}

		if (!response.ok) {
			console.error(`odh-autocoder: autocoder responded with status ${response.status}`);
			return failure(502, UNAVAILABLE);
		}

		const contentType = response.headers.get('content-type') ?? 'none';
		let content: unknown;
		let text = '';
		try {
			text = await response.text();
			content = JSON.parse(text);
		} catch {
			console.error(
				`odh-autocoder: autocoder response is not JSON (status: ${response.status}, content-type: ${contentType}, length: ${text.length})`
			);
			return failure(502, UNAVAILABLE);
		}
		const body = toAutocoderResponse(content);
		if (!body) {
			console.error(
				`odh-autocoder: unexpected autocoder response (content-type: ${contentType}, shape: ${describeShape(
					content
				)})`
			);
			return failure(502, UNAVAILABLE);
		}

		return json(body);
	};
}
