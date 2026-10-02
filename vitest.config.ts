import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [sveltekit()],
  // Svelte 4 resolves to its server build under vitest by default, which turns onMount into a
  // no-op. The browser condition makes component lifecycle behave as it does in the app.
  resolve: {
    conditions: ['browser'],
    alias: {
      // The same condition would also select jose's browser build, whose base64url encoder
      // fails under jsdom's btoa. Keep jose on the Node build it used before.
      jose: fileURLToPath(new URL('./node_modules/jose/dist/node/esm/index.js', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    setupFiles: ['src/lib/test/setup.ts']
  }
});
