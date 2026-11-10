import type { Observation } from 'fhir/r4';
import { LOINC, ODH_IS_CURRENT_JOB_EXTENSION } from './templates.js';
import { ODH_BLANK_ENTRIES, copyOf, type OdhFormValues } from './values.js';

// Reads existing ODH resources back into form values, so saved work info can be edited.

// Month inputs hold "YYYY-MM" or "YYYY", but stored dates can have any FHIR precision (year,
// year-month, date, or dateTime): keep a year as is, and cut finer dates down to the month.
function toInputValue(value: string | undefined): string {
	return value?.match(/^\d{4}(-\d{2})?/)?.[0] ?? '';
}

function withLoincCode(resources: Observation[], code: string): any[] {
	return resources?.filter((r) =>
		r.code?.coding?.find((c) => c.code === code && c.system === 'http://loinc.org')
	);
}

function getJobHistoryResources(resources: Observation[]) {
	return withLoincCode(resources, LOINC.HISTORY_OF_OCCUPATION);
}

function getCurrentJobResources(resources: Observation[]) {
	const jhrs = getJobHistoryResources(resources);
	return jhrs.filter((r) =>
		r.extension.find((e: any) => e.url === ODH_IS_CURRENT_JOB_EXTENSION && e.valueBoolean)
	);
}

function getPastJobResources(resources: Observation[]) {
	const jhrs = getJobHistoryResources(resources);
	return jhrs.filter((r) =>
		r.extension.find((e: any) => e.url === ODH_IS_CURRENT_JOB_EXTENSION && !e.valueBoolean)
	);
}

function getEmploymentStatusResource(resources: Observation[]) {
	return withLoincCode(resources, LOINC.EMPLOYMENT_STATUS).pop();
}

function getRetirementDateResources(resources: Observation[]) {
	return withLoincCode(resources, LOINC.RETIREMENT_DATE);
}

function getCombatPeriodResources(resources: Observation[]) {
	return withLoincCode(resources, LOINC.COMBAT_ZONE_PERIOD);
}

function readJob(resource: any) {
	const jobValues: any = copyOf(ODH_BLANK_ENTRIES.currentWork);
	jobValues.occupation = resource.valueCodeableConcept?.coding[0]?.code
		? {
				Code: resource.valueCodeableConcept.coding[0].code,
				Title: resource.valueCodeableConcept?.coding[0]?.display ?? 'Unknown Occupation',
				Score: 1
		  }
		: undefined;
	jobValues.industry = resource.component[0].valueCodeableConcept?.coding[0]?.code
		? {
				Code: resource.component[0].valueCodeableConcept.coding[0].code,
				Title: resource.component[0].valueCodeableConcept?.coding[0]?.display ?? 'Unknown Industry',
				Score: 1
		  }
		: undefined;
	jobValues.start = toInputValue(resource.effectivePeriod?.start);
	return jobValues;
}

function applyCurrentJobs(values: OdhFormValues, resources: Observation[]) {
	const currentJobResources = getCurrentJobResources(resources);
	if (currentJobResources.length === 0) {
		return;
	}
	values.isWorking = true;
	values.currentWork = [];
	for (const resource of currentJobResources) {
		values.currentWork.push(readJob(resource));
	}
}

function applyPastJobs(values: OdhFormValues, resources: Observation[]) {
	const pastJobResources = getPastJobResources(resources);
	if (pastJobResources.length === 0) {
		return;
	}
	values.wasWorkingPast = true;
	values.pastWork = [];
	for (const resource of pastJobResources) {
		const jobValues = readJob(resource);
		jobValues.end = toInputValue(resource.effectivePeriod?.end);
		values.pastWork.push(jobValues);
	}
}

function applyEmploymentStatus(values: OdhFormValues, resources: Observation[]) {
	const employmentStatusResource = getEmploymentStatusResource(resources);
	if (employmentStatusResource) {
		values.status = employmentStatusResource.valueCodeableConcept?.coding[0]?.display ?? 'Employed';
	}
}

function applyRetirementDates(values: OdhFormValues, resources: Observation[]) {
	const retirementDateResources = getRetirementDateResources(resources);
	values.retirementDates = [];
	for (const resource of retirementDateResources) {
		values.retirementDates.push({
			start: toInputValue(resource.valueDateTime)
		});
	}
}

function applyCombatPeriods(values: OdhFormValues, resources: Observation[]) {
	const combatPeriodResources = getCombatPeriodResources(resources);
	values.combatPeriods = [];
	for (const resource of combatPeriodResources) {
		values.combatPeriods.push({
			start: toInputValue(resource.valuePeriod?.start),
			end: toInputValue(resource.valuePeriod?.end)
		});
	}
}

/**
 * Applies existing ODH resources to form values, in place. Sections without matching
 * resources keep their current values, except retirement dates and combat zone periods, which
 * are replaced. With no resources at all, the values are left unchanged.
 */
export function applyOdhResources(values: OdhFormValues, resources: Observation[]): OdhFormValues {
	if (!resources?.length) {
		return values;
	}
	applyCurrentJobs(values, resources);
	applyPastJobs(values, resources);
	applyEmploymentStatus(values, resources);
	applyRetirementDates(values, resources);
	applyCombatPeriods(values, resources);
	return values;
}
