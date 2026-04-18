import { error } from '@sveltejs/kit';
import type { PageServerLoad } from '$types';
import { INSTANCE_CONFIG } from '$lib/config/instance_config';
import type { DataFormConfig } from '$lib/utils/types';
import type { SvelteComponent } from 'svelte';

let sections: Array<{
  id: string;
  title?: string | SvelteComponent;
  description?: string;
  category: string;
  forms: DataFormConfig[]
}> = INSTANCE_CONFIG.pages.data.sections;

export const load: PageServerLoad = async ({ params, locals }) => {
  const category = params.category;
  const categoryIndex = sections.findIndex(section => section.category === category);
  const method = params.method;
  const methodIndex = sections[categoryIndex].forms.findIndex(form => form.method === method);
  const form = sections.find(section => section.category === category)?.forms.find(form => form.method === method);
  if (locals.token && !form) {
    throw error(404, 'Form not found');
  }

  return { category, method, categoryIndex, methodIndex };
};
