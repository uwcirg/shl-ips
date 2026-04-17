import { error } from '@sveltejs/kit';
import type { PageServerLoad } from '$types';
import type { SHLAdminParams } from '$lib/utils/managementClient';
import { API_BASE } from '$lib/config/config.ts';
import { getUserShls } from '$lib/utils/shlServerUtils';


export const load: PageServerLoad = async ({ params, locals }) => {
  const shls = await getUserShls(API_BASE, locals.token);
  if (!Array.isArray(shls)) {
    console.error("SHLs aren't array");
    return { shl: null };
  }
  const shl = shls.find((shl: SHLAdminParams) => shl.id === params.id);

  if (locals.token && !shl) {
    throw error(404, 'Health link not found');
  }

  return { shl };
};
