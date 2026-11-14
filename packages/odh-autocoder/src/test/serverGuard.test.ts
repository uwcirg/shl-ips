import { describe, expect, it } from 'vitest';

// Tests run with the browser export condition (see vite.config.ts), under which esm-env
// reports BROWSER, as it would in a client bundle.
describe('odh-autocoder/server', () => {
	it('refuses to load in the browser', async () => {
		await expect(import('$lib/server/index.js')).rejects.toThrow(
			'odh-autocoder/server must not be imported in the browser'
		);
	});
});
