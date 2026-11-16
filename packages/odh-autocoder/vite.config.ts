import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5180
	},
	// Pre-bundle at startup; discovering it on first page load makes Vite re-optimize and reload
	// mid-render, which mixes two Svelte runtimes for a moment.
	optimizeDeps: {
		include: ['@sveltestrap/sveltestrap']
	},
	// Svelte 4 resolves to its server build under vitest by default, which turns onMount into a
	// no-op. The browser condition makes component lifecycle behave as it does in an app.
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		setupFiles: ['src/test/setup.ts']
	}
});
