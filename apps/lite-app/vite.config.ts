import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5190
	},
	// Pre-bundle at startup; discovering it on first page load makes Vite re-optimize and reload
	// mid-render.
	optimizeDeps: {
		include: ['@sveltestrap/sveltestrap']
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
