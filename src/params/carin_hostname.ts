import type { ParamMatcher } from '@sveltejs/kit';

export const ALLOWED = <const> [
	'acentra',
	'aetna',
	'carefirst',
	'cpcds',
	'humana',
	'inferno',
	'onyx',
	'bluebutton',
];

export const match = ((param: string): param is typeof ALLOWED[number] => {
	return ALLOWED.includes(param as typeof ALLOWED[number]);
}) satisfies ParamMatcher;
