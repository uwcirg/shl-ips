import type { Observation } from 'fhir/r4';

// Existing ODH resources used to seed the form in tests, and the fixture each scenario's output
// is compared against (src/test/fixtures/odh/<name>.json). The fixtures were captured from the
// main app's ODHForm before the feature was extracted into this package.

const ODH_JOB_PROFILE = 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob';
const IS_CURRENT_JOB = 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-isCurrentJob-extension';

type Coding = { code: string; display: string };
type Job = { occupation?: Coding; industry?: Coding; start?: string; end?: string };

let nextId = 0;

export function job(current: boolean, { occupation, industry, start, end }: Job): Observation {
	const period: Record<string, string> = {};
	if (start) period.start = start;
	if (end) period.end = end;
	return {
		resourceType: 'Observation',
		id: `seed-${nextId++}`,
		meta: { profile: [ODH_JOB_PROFILE] },
		extension: [{ url: IS_CURRENT_JOB, valueBoolean: current }],
		status: 'final',
		code: { coding: [{ system: 'http://loinc.org', code: '11341-5' }] },
		...(start || end ? { effectivePeriod: period } : {}),
		valueCodeableConcept: { coding: occupation ? [occupation] : [] },
		component: [
			{
				code: { coding: [{ system: 'http://loinc.org', code: '86188-0' }] },
				valueCodeableConcept: { coding: industry ? [industry] : [] }
			}
		]
	};
}

export function employmentStatus(display: string): Observation {
	return {
		resourceType: 'Observation',
		status: 'final',
		code: { coding: [{ system: 'http://loinc.org', code: '74165-2' }] },
		valueCodeableConcept: { coding: [{ code: display.replace(/ /g, ''), display }] }
	};
}

export function retirementDate(valueDateTime: string): Observation {
	return {
		resourceType: 'Observation',
		status: 'final',
		code: { coding: [{ system: 'http://loinc.org', code: '87510-4' }] },
		valueDateTime
	};
}

export function combatPeriod(start?: string, end?: string): Observation {
	return {
		resourceType: 'Observation',
		status: 'final',
		code: { coding: [{ system: 'http://loinc.org', code: '87511-2' }] },
		valuePeriod: { ...(start ? { start } : {}), ...(end ? { end } : {}) }
	};
}

const NURSE = { code: '29-1141', display: 'Registered Nurses' };
const HOSPITALS = { code: '622000', display: 'General Medical and Surgical Hospitals' };
const CENSUS_OCCUPATION = { code: '3255', display: 'Registered nurses' };
const COOK = { code: '35-2014', display: 'Cooks, Restaurant' };
const RESTAURANTS = { code: '722511', display: 'Full-Service Restaurants' };

export interface Scenario {
	/** Fixture file name, without extension */
	name: string;
	description: string;
	/** Existing resources the form starts from; undefined for a new, untouched form */
	resources?: Observation[];
}

export const SCENARIOS: Scenario[] = [
	{
		name: 'default',
		description: 'an untouched form'
	},
	{
		name: 'round-trip',
		// Dates finer than a month are cut to YYYY-MM; a year-only date such as '2009' is kept
		description: 'existing ODH resources of every kind',
		resources: [
			employmentStatus('Employed'),
			job(true, { occupation: NURSE, industry: HOSPITALS, start: '2019-03' }),
			job(true, { occupation: CENSUS_OCCUPATION, start: '2021-06-15T08:00:00Z' }),
			job(false, { occupation: COOK, industry: RESTAURANTS, start: '2010-01', end: '2014-12-31' }),
			job(false, { industry: RESTAURANTS, end: '2009' }),
			retirementDate('2015-01-01'),
			combatPeriod('2005-02', '2006-08'),
			combatPeriod('2007-04')
		]
	},
	{
		name: 'duplicates',
		description: 'duplicate entries',
		resources: [
			employmentStatus('Employed'),
			job(true, { occupation: NURSE, industry: HOSPITALS, start: '2019-03' }),
			job(false, { occupation: COOK, industry: RESTAURANTS, start: '2010-01', end: '2014-12' }),
			job(false, { occupation: COOK, industry: RESTAURANTS, start: '2010-01', end: '2014-12' }),
			retirementDate('2015-01'),
			retirementDate('2015-01')
		]
	},
	{
		name: 'not-in-labor-force',
		description: 'a stored employment status',
		resources: [
			employmentStatus('Not in labor force'),
			job(false, { occupation: COOK, industry: RESTAURANTS, start: '2010-01', end: '2014-12' })
		]
	},
	{
		name: 'first-job-no-start',
		// Employed since the earliest current job with a start date (jobs without one are skipped)
		description: 'a first current job without a start date',
		resources: [
			employmentStatus('Employed'),
			job(true, { occupation: NURSE, industry: HOSPITALS }),
			job(true, { occupation: COOK, industry: RESTAURANTS, start: '2020-02' })
		]
	},
	{
		name: 'unemployed-with-current-job',
		// Only Employed takes an effective period from current jobs (none are emitted otherwise)
		description: 'unemployed with a current job on file',
		resources: [
			employmentStatus('Unemployed'),
			job(true, { occupation: NURSE, industry: HOSPITALS, start: '2018-05' })
		]
	}
];

export function fixturePath(name: string) {
	return `./fixtures/odh/${name}.json`;
}
