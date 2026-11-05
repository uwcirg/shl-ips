import { json } from '@sveltejs/kit';
import { INSTANCE_CONFIG } from '$lib/config/instance_config';
import type { RequestHandler } from './$types';

// The web app manifest, built from the instance's config so each instance has its own name and
// icon. The icon is `pwa-icon.png` in the instance's image folder (INSTANCE_CONFIG.imgPath), which
// should be 512px square. An instance can also list `pwaScreenshots` (a wide and a narrow one) for
// the install dialog, and a `pwaDescription` for it; instances without them leave them out.
const { pwaScreenshots: screenshots, pwaDescription: description } = INSTANCE_CONFIG as {
  pwaScreenshots?: Array<Record<string, string>>;
  pwaDescription?: string;
};

export const GET: RequestHandler = () =>
  json(
    {
      name: INSTANCE_CONFIG.title,
      short_name: INSTANCE_CONFIG.title,
      ...(description ? { description } : {}),
      // Identifies the app independently of start_url, so changing start_url later doesn't make
      // browsers treat it as a different app
      id: '/',
      start_url: '/',
      scope: '/',
      icons: [
        {
          src: `${INSTANCE_CONFIG.imgPath}/pwa-icon.png`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        }
      ],
      ...(screenshots?.length ? { screenshots } : {}),
      display: 'standalone',
      background_color: '#f8f9fa',
      theme_color: '#f8f9fa'
    },
    { headers: { 'content-type': 'application/manifest+json', 'cache-control': 'no-cache' } }
  );
