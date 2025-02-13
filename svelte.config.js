import { vitePreprocess } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';

const dev = process.argv.includes('dev');

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      precompress: false,
      envPrefix: ''
    })
  }
};
