import { vitePreprocess } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';
import { INSTANCE_CONFIG } from './src/lib/config/instance_config';

const disallowedRoutes = INSTANCE_CONFIG.disallowedRoutes.map((r) => `/${r}`);

const dev = process.argv.includes('dev');

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      // default options are shown.
      out: 'build',
      precompress: false,
      envPrefix: ''
    }),
    csp: {
      directives: {
        'script-src': ['self']
      },
      reportOnly: {
        'script-src': ['self'],
        'report-uri': ['/']
      }
    },
    prerender: {
      handleHttpError: ({ path, status, message }) => {
        // ignore 404s on disallowed routes
        if (disallowedRoutes.find((r) => path.startsWith(r)) && status === 404) {
          console.log(`Skipping prerender of disallowed path: ${path}`);
          return; // don't fail the build
        }
        throw new Error(`${status} on ${path}: ${message}`);
      },
      entries: [
        '/', // homepage
        ...allowedRoutes, // only prerender allowed routes
      ]
    }
  }
};
