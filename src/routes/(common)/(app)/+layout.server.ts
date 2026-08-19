import { error } from '@sveltejs/kit';
import { INSTANCE_CONFIG } from '$lib/config/instance_config';
import type { LayoutServerLoad } from './$types';

/**
 * Handle disallowed pages in same way an un-routed page would be
 */
const disallowedPages = INSTANCE_CONFIG.disallowedPages;

export const load: LayoutServerLoad = async ({ url, locals }) => {
  const segment = url.pathname.split('/')[1];

  if (disallowedPages.includes(segment)) {
    console.log(`Disallowed page: ${segment}`);
    throw error(404, 'Not found');
  }

  if (!locals.token) {
    console.log('No token');
    return { unauthenticated: true };
  }
  console.log('Authenticated successfully');
  return { unauthenticated: false };
};