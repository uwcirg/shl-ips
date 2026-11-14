import { BROWSER } from 'esm-env';

// SvelteKit's $lib/server protection doesn't apply to dependencies, so guard at runtime.
if (BROWSER) {
	throw new Error('odh-autocoder/server must not be imported in the browser');
}

export {
	createAutocoderHandler,
	DEFAULT_AUTOCODER_API_URL,
	type AutocoderHandlerOptions
} from './handler.js';
