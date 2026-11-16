import { env } from '$env/dynamic/private';
import { createAutocoderHandler } from '$lib/server/index.js';

// Playground endpoint, mounted the same way an app mounts it. With AUTOCODER_API_KEY set (e.g. in
// packages/odh-autocoder/.env) it calls the real autocoder; otherwise the local mock.
const useRealApi = Boolean(env.AUTOCODER_API_KEY);

export const GET = createAutocoderHandler({
	apiKey: () => env.AUTOCODER_API_KEY || 'playground',
	apiUrl: useRealApi ? undefined : '/mock-autocoder'
});
