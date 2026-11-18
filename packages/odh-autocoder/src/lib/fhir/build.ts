import type { Observation, Reference } from 'fhir/r4';
import { NOT_CODED, type IOResponse } from '../types.js';
import {
	combatPeriodTemplate,
	currentJobTemplate,
	employmentStatusTemplate,
	pastJobTemplate,
	retirementDateTemplate
} from './templates.js';
import {
	EMPLOYMENT_STATUSES,
	ODH_SECTIONS,
	isWorking,
	type CombatPeriodEntry,
	type CurrentJobEntry,
	type EmploymentStatusEntry,
	type OdhFormValues,
	type OdhSectionKey,
	type PastJobEntry,
	type RetirementDateEntry
} from './values.js';

// Builds ODH FHIR resources from form entries, one resource per entry. Pure: the same entries
// always give the same resources. A resource's id is its entry's id, and it has none when the
// entry has none.

export interface OdhBuildOptions {
	/**
	 * Subject of every resource, e.g. the patient they describe. Resources have no subject when
	 * it isn't given.
	 */
	subject?: Reference;
}

export interface OdhFormBuildOptions extends OdhBuildOptions {
	/** Sections to build. Defaults to all of them. */
	sections?: readonly OdhSectionKey[];
}

export interface EmploymentStatusBuildOptions extends OdhBuildOptions {
	/** Start of the status's effective period; usually the earliest current job's start */
	employedSince?: string;
}

// Builders fill in templates through paths the Observation type marks optional
function fromTemplate(
	template: Observation,
	id: string | undefined,
	{ subject }: OdhBuildOptions = {}
): any {
	// id goes after resourceType and subject after code, the usual FHIR order
	const resource: any = {};
	for (const [key, value] of Object.entries(JSON.parse(JSON.stringify(template)))) {
		resource[key] = value;
		if (key === 'resourceType' && id) {
			resource.id = id;
		}
		if (key === 'code' && subject) {
			resource.subject = JSON.parse(JSON.stringify(subject));
		}
	}
	return resource;
}

function occupationSystem(code: string) {
	return code.indexOf('-') >= 0
		? 'http://hl7.org/fhir/us/odh/CodeSystem/PHOccupationalDataForHealthODH'
		: 'urn:oid:2.16.840.1.113883.2.9.6.2.7';
}

const INDUSTRY_SYSTEM = 'http://terminology.hl7.org/CodeSystem/PHOccupationalDataForHealthODH';

function period(start: string, end?: string) {
	return { ...(start ? { start } : {}), ...(end ? { end } : {}) };
}

function buildJob(
	template: Observation,
	job: CurrentJobEntry,
	effectivePeriod: { start?: string; end?: string },
	options: OdhBuildOptions
): Observation {
	const resource = fromTemplate(template, job.id, options);
	if (effectivePeriod.start || effectivePeriod.end) {
		resource.effectivePeriod = effectivePeriod;
	}
	const occupation: IOResponse = job.occupation ?? NOT_CODED.Occupation[0];
	resource.valueCodeableConcept.coding = [
		{ system: occupationSystem(occupation.Code), code: occupation.Code, display: occupation.Title }
	];
	const industry: IOResponse = job.industry ?? NOT_CODED.Industry[0];
	resource.component[0].valueCodeableConcept.coding = [
		{ system: INDUSTRY_SYSTEM, code: industry.Code, display: industry.Title }
	];
	return resource;
}

/** One current job. An uncoded occupation or industry is saved as not coded. */
export function buildCurrentJob(job: CurrentJobEntry, options: OdhBuildOptions = {}): Observation {
	return buildJob(currentJobTemplate, job, period(job.start), options);
}

/** One past job. An uncoded occupation or industry is saved as not coded. */
export function buildPastJob(job: PastJobEntry, options: OdhBuildOptions = {}): Observation {
	return buildJob(pastJobTemplate, job, period(job.start, job.end), options);
}

export function buildRetirementDate(
	entry: RetirementDateEntry,
	options: OdhBuildOptions = {}
): Observation {
	const resource = fromTemplate(retirementDateTemplate, entry.id, options);
	resource.valueDateTime = entry.start;
	return resource;
}

export function buildCombatPeriod(
	entry: CombatPeriodEntry,
	options: OdhBuildOptions = {}
): Observation {
	const resource = fromTemplate(combatPeriodTemplate, entry.id, options);
	resource.valuePeriod = period(entry.start, entry.end);
	return resource;
}

export function buildEmploymentStatus(
	entry: EmploymentStatusEntry,
	{ employedSince, ...options }: EmploymentStatusBuildOptions = {}
): Observation {
	const resource = fromTemplate(employmentStatusTemplate, entry.id, options);
	resource.valueCodeableConcept.coding[0].code = EMPLOYMENT_STATUSES[entry.status];
	resource.valueCodeableConcept.coding[0].display = entry.status;
	if (employedSince) {
		resource.effectivePeriod = { start: employedSince };
	}
	return resource;
}

/**
 * Builds each entry, leaving out entries whose resource duplicates an earlier one's (ignoring
 * ids, so the first entry's id is kept)
 */
function buildUnique<E>(entries: E[], build: (entry: E) => Observation): Observation[] {
	const seen = new Set<string>();
	const resources: Observation[] = [];
	for (const entry of entries) {
		const resource = build(entry);
		const key = JSON.stringify({ ...resource, id: undefined });
		if (!seen.has(key)) {
			seen.add(key);
			resources.push(resource);
		}
	}
	return resources;
}

export function buildCurrentJobs(jobs: CurrentJobEntry[], options: OdhBuildOptions = {}) {
	return buildUnique(jobs, (job) => buildCurrentJob(job, options));
}

export function buildPastJobs(jobs: PastJobEntry[], options: OdhBuildOptions = {}) {
	return buildUnique(jobs, (job) => buildPastJob(job, options));
}

/** Retirement dates; entries without a date are left out */
export function buildRetirementDates(entries: RetirementDateEntry[], options: OdhBuildOptions = {}) {
	return buildUnique(
		entries.filter((entry) => entry.start),
		(entry) => buildRetirementDate(entry, options)
	);
}

/** Combat zone periods; entries without a start or end are left out */
export function buildCombatPeriods(entries: CombatPeriodEntry[], options: OdhBuildOptions = {}) {
	return buildUnique(
		entries.filter((entry) => entry.start || entry.end),
		(entry) => buildCombatPeriod(entry, options)
	);
}

/** The earliest start among jobs that have one */
export function earliestStart(jobs: CurrentJobEntry[]): string | undefined {
	return jobs
		.map((job) => job.start)
		.filter(Boolean)
		.reduce<string | undefined>((min, start) => (min === undefined || start < min ? start : min), undefined);
}

/**
 * The ODH resources for a whole form, in section order: employment status, current jobs, past
 * jobs, retirement dates and combat zone periods. Applies the rules between sections: current
 * jobs are only included while Employed, and then date the employment status (employed since
 * the earliest one's start).
 */
export function buildOdhResources(
	values: OdhFormValues,
	{ sections = ODH_SECTIONS, ...options }: OdhFormBuildOptions = {}
): Observation[] {
	const included = new Set(sections);
	const currentJobs = included.has('currentWork') && isWorking(values) ? values.currentWork : [];
	return [
		...(included.has('employmentStatus')
			? [
					buildEmploymentStatus(values.employmentStatus, {
						...options,
						employedSince: earliestStart(currentJobs)
					})
			  ]
			: []),
		...buildCurrentJobs(currentJobs, options),
		...(included.has('pastWork') ? buildPastJobs(values.pastWork, options) : []),
		...(included.has('retirementDates') ? buildRetirementDates(values.retirementDates, options) : []),
		...(included.has('combatPeriods') ? buildCombatPeriods(values.combatPeriods, options) : [])
	];
}
