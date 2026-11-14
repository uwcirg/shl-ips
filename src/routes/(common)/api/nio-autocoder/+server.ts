import { createAutocoderHandler } from 'odh-autocoder/server';
import { AUTOCODER_API_KEY } from '$lib/server/config';

// Access is checked in hooks.server.ts, which requires a valid bearer token for /api/*.
export const GET = createAutocoderHandler({ apiKey: AUTOCODER_API_KEY });
