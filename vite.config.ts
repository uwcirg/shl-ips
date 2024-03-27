import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current working directory.
	// Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
	// const env = {...process.env, ...loadEnv(mode, process.cwd(), '')};
	process.env = {...process.env, ...loadEnv(mode, process.cwd(), ''), ...loadEnv(mode, process.cwd(), 'shl-creator')};
	return {
		// vite config
		esbuild: {
			supported: {
			  	'top-level-await': true
			},
		},
		plugins: [sveltekit()],
		server: {
			host: true,
			port: process.env.DEV_SERVER_PORT ? process.env.DEV_SERVER_PORT : 3000
		}
	}
});