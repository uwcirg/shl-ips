import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		rollupOptions: {
			input: {
				ips: resolve(__dirname, 'ips/index.html')
			}
		}
	},
	server: {
		host: true,
		port: 8080
	}
});
