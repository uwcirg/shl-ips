import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$ips: mode === "production" ? "/ips" : "/ips/index.html",
		},
	},
	server: {
		host: true,
		port: 8080
	}
}));
