import { getContext, hasContext, setContext } from 'svelte';
import { NOT_CODED, type AutocoderResponse, type CodingMode, type IOResponse } from '../types.js';

// Calls the app's autocoder endpoint (see createAutocoderHandler in odh-autocoder/server) from
// the browser. Coders get a client from context, so the app configures it once.

export interface AutocoderClientOptions {
	/** The app's autocoder endpoint. Defaults to /api/nio-autocoder. */
	endpoint?: string;
	/** When set, requests carry an Authorization: Bearer header with the token it returns */
	getAccessToken?: () => Promise<string | undefined>;
}

export interface AutocoderQuery {
	/** Occupation text to code */
	occupation?: string;
	/** Industry text to code */
	industry?: string;
}

export interface AutocoderClient {
	/**
	 * Codes occupation and/or industry text in one request. Resolves with the suggestions for
	 * the fields asked for; rejects when the service fails, or with an AbortError when aborted.
	 */
	code(query: AutocoderQuery, init?: { signal?: AbortSignal }): Promise<Partial<AutocoderResponse>>;
}

export const DEFAULT_AUTOCODER_ENDPOINT = '/api/nio-autocoder';

export function createAutocoderClient({
	endpoint = DEFAULT_AUTOCODER_ENDPOINT,
	getAccessToken
}: AutocoderClientOptions = {}): AutocoderClient {
	return {
		async code({ occupation, industry }, { signal } = {}) {
			const params = [
				occupation ? `o=${encodeURIComponent(occupation)}` : '',
				industry ? `i=${encodeURIComponent(industry)}` : '',
				'c=0'
			].filter(Boolean);
			const headers: Record<string, string> = {};
			if (getAccessToken) {
				headers.Authorization = `Bearer ${await getAccessToken()}`;
			}
			const response = await fetch(`${endpoint}?${params.join('&')}`, {
				signal,
				method: 'GET',
				headers
			});
			if (!response.ok) {
				throw new Error(`Autocoder request failed with status ${response.status}`);
			}
			const text = await response.text();
			return text ? JSON.parse(text) : {};
		}
	};
}

const CONTEXT_KEY = Symbol('odh-autocoder-client');

/** Makes a client available to the coders in this component's subtree */
export function setAutocoderClient(client: AutocoderClient): AutocoderClient {
	return setContext(CONTEXT_KEY, client);
}

/** The client set by an ancestor, or one for the default endpoint */
export function getAutocoderClient(): AutocoderClient {
	return hasContext(CONTEXT_KEY) ? getContext(CONTEXT_KEY) : createAutocoderClient();
}

/** The code used when a field isn't coded (00-0000 or 000000) */
export function notCoded(mode: CodingMode): IOResponse {
	return { ...NOT_CODED[mode][0] };
}

export function isNotCoded(io: IOResponse | undefined): boolean {
	return io?.Code === NOT_CODED.Occupation[0].Code || io?.Code === NOT_CODED.Industry[0].Code;
}

/** Suggestions without the autocoder's own not-coded results */
export function withoutNotCoded(list: IOResponse[] | undefined): IOResponse[] {
	return (list ?? []).filter((io) => !isNotCoded(io));
}
