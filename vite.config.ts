import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };
  return {
    // vite config
    plugins: [sveltekit()],
    optimizeDeps: {
      entries: ['src/routes/**/+*.{js,ts,svelte}','src/hooks*.{js,ts}']
    },
    server: {
      host: true,
      allowedHosts: [process.env.SERVER_NAME ?? 'localhost'],
      port: process.env.DEV_SERVER_PORT ? process.env.DEV_SERVER_PORT : 3000,
      strictPort: true
    },
    build: {
      sourcemap: process.env.DEBUG ?? false
    },
    resolve: {
      alias: {
        '$theme': `/src/lib/scss/_styles_${process.env.VITE_INSTANCE_ID ?? 'WAHealthSummary'}.scss`
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler', // or "modern"
          silenceDeprecations: ['color-functions', 'global-builtin', 'import', 'if-function', 'legacy-js-api']
        }
      }
    }
  }
});
