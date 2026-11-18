import type { Observation } from 'fhir/r4';
import type { IOResponse } from '../types.js';
import { LOINC, ODH_IS_CURRENT_JOB_EXTENSION } from './templates.js';
import {
	blankEntry,
	defaultOdhFormValues,
	employmentStatusEntry,
	type CombatPeriodEntry,
	type CurrentJobEntry,
	type EmploymentStatusEntry,
	type OdhFormValues,
	type OdhIdOptions,
	type PastJobEntry,
	type RetirementDateEntry
} from './values.js';

// Reads existing ODH resources back into form entries, so saved work info can be edited.

export interface OdhReadOptions {
	/**
	 * The id to give the entry read from a resource, which becomes the id of the resource it's
	 * saved as. Defaults to the resource's own id.
	 */
	getId?: (resource: Observation) => string | undefined;
}

// Month inputs hold "YYYY-MM" or "YYYY", but stored dates can have any FHIR precision (year,
// year-month, date, or dateTime): keep a year as is, and cut finer dates down to the month.
function toInputValue(value: string | undefined): string {
	return value?.match(/^\d{4}(-\d{2})?/)?.[0] ?? '';
}

function withLoincCode(resources: Observation[], code: string): Observation[] {
	return (resources ?? []).filter((r) =>
		r.code?.coding?.find((c) => c.code === code && c.system === 'http://loinc.org')
	);
}

// A job without the isCurrentJob flag counts as a past job
function isCurrentJob(resource: Observation): boolean {
	return (
		resource.extension?.find((e) => e.url === ODH_IS_CURRENT_JOB_EXTENSION)?.valueBoolean === true
	);
}

function idOf(resource: Observation, { getId = (r) => r.id }: OdhReadOptions): { id?: string } {
	const id = getId(resource);
	return id ? { id } : {};
}

function readCode(
	coding: { code?: string; display?: string } | undefined,
	fallbackTitle: string
): IOResponse | undefined {
	return coding?.code ? { Code: coding.code, Title: coding.display ?? fallbackTitle, Score: 1 } : undefined;
}

function readJob(resource: Observation, options: OdhReadOptions): CurrentJobEntry {
	const occupation = readCode(resource.valueCodeableConcept?.coding?.[0], 'Unknown Occupation');
	const industry = readCode(
		resource.component?.[0]?.valueCodeableConcept?.coding?.[0],
		'Unknown Industry'
	);
	return {
		...idOf(resource, options),
		...(occupation ? { occupation } : {}),
		...(industry ? { industry } : {}),
		start: toInputValue(resource.effectivePeriod?.start)
	};
}

function jobResources(resources: Observation[], current: boolean) {
	return withLoincCode(resources, LOINC.HISTORY_OF_OCCUPATION).filter(
		(r) => isCurrentJob(r) === current
	);
}

export function readCurrentJobs(
	resources: Observation[],
	options: OdhReadOptions = {}
): CurrentJobEntry[] {
	return jobResources(resources, true).map((r) => readJob(r, options));
}

export function readPastJobs(resources: Observation[], options: OdhReadOptions = {}): PastJobEntry[] {
	return jobResources(resources, false).map((r) => ({
		...readJob(r, options),
		end: toInputValue(r.effectivePeriod?.end)
	}));
}

/** The last employment status resource's entry, or undefined when there is none */
export function readEmploymentStatus(
	resources: Observation[],
	options: OdhReadOptions = {}
): EmploymentStatusEntry | undefined {
	const resource = withLoincCode(resources, LOINC.EMPLOYMENT_STATUS).pop();
	if (!resource) {
		return undefined;
	}
	return {
		...idOf(resource, options),
		status: resource.valueCodeableConcept?.coding?.[0]?.display ?? 'Employed'
	};
}

export function readRetirementDates(
	resources: Observation[],
	options: OdhReadOptions = {}
): RetirementDateEntry[] {
	return withLoincCode(resources, LOINC.RETIREMENT_DATE).map((r) => ({
		...idOf(r, options),
		start: toInputValue(r.valueDateTime)
	}));
}

export function readCombatPeriods(
	resources: Observation[],
	options: OdhReadOptions = {}
): CombatPeriodEntry[] {
	return withLoincCode(resources, LOINC.COMBAT_ZONE_PERIOD).map((r) => ({
		...idOf(r, options),
		start: toInputValue(r.valuePeriod?.start),
		end: toInputValue(r.valuePeriod?.end)
	}));
}

/**
 * A form's values read from existing ODH resources. Sections without resources get the new
 * form's defaults: Employed, with one blank current job (ids for those come from createId).
 */
export function readOdhValues(
	resources: Observation[] | undefined,
	options: OdhReadOptions & OdhIdOptions = {}
): OdhFormValues {
	if (!resources?.length) {
		return defaultOdhFormValues(options);
	}
	const currentWork = readCurrentJobs(resources, options);
	return {
		employmentStatus:
			readEmploymentStatus(resources, options) ?? employmentStatusEntry('Employed', options),
		currentWork: currentWork.length ? currentWork : [blankEntry('currentWork', options)],
		pastWork: readPastJobs(resources, options),
		retirementDates: readRetirementDates(resources, options),
		combatPeriods: readCombatPeriods(resources, options)
	};
}
