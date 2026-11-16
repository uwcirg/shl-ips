import { env } from '$env/dynamic/private';
import { createAutocoderHandler } from 'odh-autocoder/server';
import { isSameOrigin } from '$lib/server/sameOrigin';

// Secrets are read per request from the server environment (.env in development).
export const GET = createAutocoderHandler({
	apiKey: () => env.AUTOCODER_API_KEY,
	apiUrl: env.AUTOCODER_API_URL || undefined,
	authorize: isSameOrigin
});
