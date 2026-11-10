import type { Observation, Reference } from 'fhir/r4';
import {
	combatPeriodTemplate,
	currentJobTemplate,
	employmentStatusTemplate,
	pastJobTemplate,
	retirementDateTemplate
} from './templates.js';
import { EMPLOYMENT_STATUSES, type OdhFormValues } from './values.js';

// Builds ODH FHIR resources from the form's values. Pure: resource ids come from each entry's
// position, so the same values always produce the same resources.

export interface OdhBuildOptions {
	/**
	 * Subject of every resource, e.g. the patient they describe. Resources have no subject when
	 * it isn't given.
	 */
	subject?: Reference;
}

// Builders fill in templates through paths the Observation type marks optional
function fromTemplate(template: Observation, { subject }: OdhBuildOptions = {}): any {
	const resource = JSON.parse(JSON.stringify(template));
	if (!subject) {
		return resource;
	}
	// Placed after code, where FHIR (and the templates, originally) put it
	const withSubject: any = {};
	for (const [key, value] of Object.entries(resource)) {
		withSubject[key] = value;
		if (key === 'code') {
			withSubject.subject = JSON.parse(JSON.stringify(subject));
		}
	}
	return withSubject;
}

function sortObjectKeys(obj: any): any {
	return Object.keys(obj)
		.sort()
		.reduce((result: any, key: any) => {
			result[key] = obj[key];
			return result;
		}, {});
}

function deduplicateObjectList<T>(arr: T[]): T[] {
	const seen = new Set();
	return arr.filter((item: any) => {
		const strItem = JSON.stringify(sortObjectKeys(item));
		const duplicate = seen.has(strItem);
		seen.add(strItem);
		return !duplicate;
	});
}

function occupationSystem(code: string) {
	return code.indexOf('-') >= 0
		? 'http://hl7.org/fhir/us/odh/CodeSystem/PHOccupationalDataForHealthODH'
		: 'urn:oid:2.16.840.1.113883.2.9.6.2.7';
}

const INDUSTRY_SYSTEM = 'http://terminology.hl7.org/CodeSystem/PHOccupationalDataForHealthODH';

export function buildCurrentJobResources(values: OdhFormValues, options: OdhBuildOptions = {}): Observation[] {
	const currentJobResources: Observation[] = [];
	if (!values.isWorking) {
		return currentJobResources;
	} // Don't add current job data if not working
	const uniqueJobs = deduplicateObjectList(values.currentWork);
	for (const [i, jobValue] of uniqueJobs.entries()) {
		const currentJobResource = fromTemplate(currentJobTemplate, options);
		currentJobResource.id = `odh-current-job-${i}`;
		if (jobValue.start) {
			let period: any = { start: jobValue.start };
			currentJobResource.effectivePeriod = period;
		}
		if (jobValue.occupation) {
			currentJobResource.valueCodeableConcept.coding = [
				{
					system: occupationSystem(jobValue.occupation.Code),
					code: jobValue.occupation.Code,
					display: jobValue.occupation.Title
				}
			];
		}
		if (jobValue.industry) {
			currentJobResource.component[0].valueCodeableConcept.coding = [
				{
					system: INDUSTRY_SYSTEM,
					code: jobValue.industry.Code,
					display: jobValue.industry.Title
				}
			];
		}
		currentJobResources.push(currentJobResource);
	}
	return currentJobResources;
}

export function buildPastJobResources(values: OdhFormValues, options: OdhBuildOptions = {}): Observation[] {
	const pastJobResources: Observation[] = [];
	const uniqueJobs = deduplicateObjectList(values.pastWork);
	for (const [i, jobValue] of uniqueJobs.entries()) {
		const pastJobResource = fromTemplate(pastJobTemplate, options);
		pastJobResource.id = `odh-past-job-${i}`;
		if (jobValue.start || jobValue.end) {
			let period: any = {};
			if (jobValue.start) {
				period.start = jobValue.start;
			}
			if (jobValue.end) {
				period.end = jobValue.end;
			}
			pastJobResource.effectivePeriod = period;
		}
		if (jobValue.occupation) {
			pastJobResource.valueCodeableConcept.coding = [
				{
					system: occupationSystem(jobValue.occupation.Code),
					code: jobValue.occupation.Code,
					display: jobValue.occupation.Title
				}
			];
		}
		if (jobValue.industry) {
			pastJobResource.component[0].valueCodeableConcept.coding = [
				{
					system: INDUSTRY_SYSTEM,
					code: jobValue.industry.Code,
					display: jobValue.industry.Title
				}
			];
		}
		pastJobResources.push(pastJobResource);
	}
	return pastJobResources;
}

export function buildRetirementDateResources(values: OdhFormValues, options: OdhBuildOptions = {}): Observation[] {
	const retirementDateResources: Observation[] = [];
	const uniqueRetirementDates = deduplicateObjectList(values.retirementDates);
	const validRetirementDates = uniqueRetirementDates.filter((retirementDate) => retirementDate.start);
	for (const [i, retirementDate] of validRetirementDates.entries()) {
		const retirementDateResource = fromTemplate(retirementDateTemplate, options);
		retirementDateResource.id = `odh-retirement-date-${i}`;
		if (retirementDate.start) {
			retirementDateResource.valueDateTime = retirementDate.start;
		}
		retirementDateResources.push(retirementDateResource);
	}
	return retirementDateResources;
}

export function buildCombatPeriodResources(values: OdhFormValues, options: OdhBuildOptions = {}): Observation[] {
	const combatPeriodResources: Observation[] = [];
	const uniqueCombatPeriods = deduplicateObjectList(values.combatPeriods);
	const validCombatPeriods = uniqueCombatPeriods.filter(
		(combatPeriod) => combatPeriod.start || combatPeriod.end
	);
	for (const [i, combatPeriod] of validCombatPeriods.entries()) {
		const combatPeriodResource = fromTemplate(combatPeriodTemplate, options);
		combatPeriodResource.id = `odh-combat-period-${i}`;
		if (combatPeriod.start || combatPeriod.end) {
			let period: any = {};
			if (combatPeriod.start) {
				period.start = combatPeriod.start;
			}
			if (combatPeriod.end) {
				period.end = combatPeriod.end;
			}
			combatPeriodResource.valuePeriod = period;
		}
		combatPeriodResources.push(combatPeriodResource);
	}
	return combatPeriodResources;
}

export function buildEmploymentStatusResources(values: OdhFormValues, options: OdhBuildOptions = {}): Observation[] {
	const employmentStatusResource = fromTemplate(employmentStatusTemplate, options);
	employmentStatusResource.id = `odh-employment-status`;
	employmentStatusResource.valueCodeableConcept.coding[0].code = EMPLOYMENT_STATUSES[values.status];
	employmentStatusResource.valueCodeableConcept.coding[0].display = values.status;
	// Employed since the earliest current job that has a start date. Other statuses get no
	// effective period: when a current job started says nothing about when they began.
	let minDate: string | null = null;
	if (values.isWorking) {
		for (const jobValue of values.currentWork) {
			if (jobValue.start && (minDate === null || minDate > jobValue.start)) {
				minDate = jobValue.start;
			}
		}
	}
	if (minDate) {
		employmentStatusResource.effectivePeriod = {
			start: minDate
		};
	} else {
		delete employmentStatusResource.effectivePeriod;
	}
	return [employmentStatusResource];
}

/**
 * All ODH resources for the form's values: employment status, then current jobs, past jobs,
 * retirement dates and combat zone periods.
 */
export function buildOdhResources(values: OdhFormValues, options: OdhBuildOptions = {}): Observation[] {
	return [
		...buildEmploymentStatusResources(values, options),
		...buildCurrentJobResources(values, options),
		...buildPastJobResources(values, options),
		...buildRetirementDateResources(values, options),
		...buildCombatPeriodResources(values, options)
	];
}
