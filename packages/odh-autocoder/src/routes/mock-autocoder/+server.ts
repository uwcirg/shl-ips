import { json } from '@sveltejs/kit';
import type { IOResponse } from '$lib/types.js';
import type { RequestHandler } from './$types';

// Stand-in for the NIOSH autocoder API, for the playground. Matches query words against a small
// list and answers in the API's response format.

const OCCUPATIONS: IOResponse[] = [
	{ Code: '29-1141', Title: 'Registered Nurses', Score: 0 },
	{ Code: '29-2061', Title: 'Licensed Practical and Licensed Vocational Nurses', Score: 0 },
	{ Code: '35-2014', Title: 'Cooks, Restaurant', Score: 0 },
	{ Code: '47-2111', Title: 'Electricians', Score: 0 },
	{ Code: '15-1252', Title: 'Software Developers', Score: 0 },
	{ Code: '25-2021', Title: 'Elementary School Teachers, Except Special Education', Score: 0 },
	{ Code: '53-3032', Title: 'Heavy and Tractor-Trailer Truck Drivers', Score: 0 }
];

const INDUSTRIES: IOResponse[] = [
	{ Code: '622000', Title: 'General Medical and Surgical Hospitals', Score: 0 },
	{ Code: '722511', Title: 'Full-Service Restaurants', Score: 0 },
	{ Code: '238210', Title: 'Electrical Contractors and Other Wiring Installation Contractors', Score: 0 },
	{ Code: '541511', Title: 'Custom Computer Programming Services', Score: 0 },
	{ Code: '611110', Title: 'Elementary and Secondary Schools', Score: 0 },
	{ Code: '484121', Title: 'General Freight Trucking, Long-Distance, Truckload', Score: 0 }
];

function match(list: IOResponse[], text: string | null, n: number): IOResponse[] {
	const words = (text ?? '').toLowerCase().split(/\W+/).filter((w) => w.length > 2);
	return list
		.map((item) => {
			const title = item.Title.toLowerCase();
			const hits = words.filter((w) => title.includes(w.slice(0, 5))).length;
			return { ...item, Score: words.length ? hits / words.length : 0 };
		})
		.filter((item) => item.Score > 0)
		.sort((a, b) => b.Score - a.Score)
		.slice(0, n);
}

export const GET: RequestHandler = async ({ url, request }) => {
	if (!request.headers.get('Ocp-Apim-Subscription-Key')) {
		return json({ statusCode: 401, message: 'Missing subscription key' }, { status: 401 });
	}
	const n = Number(url.searchParams.get('n') ?? 6);
	return json({
		Industry: match(INDUSTRIES, url.searchParams.get('i'), n),
		Occupation: match(OCCUPATIONS, url.searchParams.get('o'), n),
		Scheme: 'NAICS 2017 and SOC 2018'
	});
};
