import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// No adapter: this project is only built with svelte-package. `vite dev` serves the
// playground in src/routes for local development.
/** @type {import('@sveltejs/kit').Config} */
export default {
	preprocess: vitePreprocess()
};
