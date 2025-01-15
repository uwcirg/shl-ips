import type { ParamMatcher } from '@sveltejs/kit';

export const match = ((param: string): param is ('acentra' | 'aetna' | 'carefirst' | 'cpcds' | 'humana') => {
	return param === 'acentra' || param === 'aetna' || param === 'carefirst' || param === 'cpcds' || param === 'humana';
}) satisfies ParamMatcher;