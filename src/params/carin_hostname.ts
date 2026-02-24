import type { ParamMatcher } from '@sveltejs/kit';

export const ALLOWED = <const> [
	'acentra',
	'aetna',
	'bluebutton',
	'carefirst',
	'cpcds',
	'humana',
	'inferno',
	'onyx',
	'deloitte',
	'smilecarinbb',
	'united',
];

export const match = ((param: string): param is typeof ALLOWED[number] => {
	return ALLOWED.includes(param as typeof ALLOWED[number]);
}) satisfies ParamMatcher;
