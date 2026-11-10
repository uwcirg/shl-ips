import type { Observation } from 'fhir/r4';
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

// Builders fill in templates through paths the Observation type marks optional
function fromTemplate(template: Observation): any {
	return JSON.parse(JSON.stringify(template));
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

export function buildCurrentJobResources(values: OdhFormValues): Observation[] {
	const currentJobResources: Observation[] = [];
	if (!values.isWorking) {
		return currentJobResources;
	} // Don't add current job data if not working
	const uniqueJobs = deduplicateObjectList(values.currentWork);
	for (const [i, jobValue] of uniqueJobs.entries()) {
		const currentJobResource = fromTemplate(currentJobTemplate);
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

export function buildPastJobResources(values: OdhFormValues): Observation[] {
	const pastJobResources: Observation[] = [];
	const uniqueJobs = deduplicateObjectList(values.pastWork);
	for (const [i, jobValue] of uniqueJobs.entries()) {
		const pastJobResource = fromTemplate(pastJobTemplate);
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

export function buildRetirementDateResources(values: OdhFormValues): Observation[] {
	const retirementDateResources: Observation[] = [];
	const uniqueRetirementDates = deduplicateObjectList(values.retirementDates);
	const validRetirementDates = uniqueRetirementDates.filter((retirementDate) => retirementDate.start);
	for (const [i, retirementDate] of validRetirementDates.entries()) {
		const retirementDateResource = fromTemplate(retirementDateTemplate);
		retirementDateResource.id = `odh-retirement-date-${i}`;
		if (retirementDate.start) {
			retirementDateResource.valueDateTime = retirementDate.start;
		}
		retirementDateResources.push(retirementDateResource);
	}
	return retirementDateResources;
}

export function buildCombatPeriodResources(values: OdhFormValues): Observation[] {
	const combatPeriodResources: Observation[] = [];
	const uniqueCombatPeriods = deduplicateObjectList(values.combatPeriods);
	const validCombatPeriods = uniqueCombatPeriods.filter(
		(combatPeriod) => combatPeriod.start || combatPeriod.end
	);
	for (const [i, combatPeriod] of validCombatPeriods.entries()) {
		const combatPeriodResource = fromTemplate(combatPeriodTemplate);
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

export function buildEmploymentStatusResources(values: OdhFormValues): Observation[] {
	const employmentStatusResource = fromTemplate(employmentStatusTemplate);
	employmentStatusResource.id = `odh-employment-status`;
	employmentStatusResource.valueCodeableConcept.coding[0].code = EMPLOYMENT_STATUSES[values.status];
	employmentStatusResource.valueCodeableConcept.coding[0].display = values.status;
	let minDate: string | null = null;
	for (const jobValue of values.currentWork) {
		if (minDate === null || minDate > jobValue.start) {
			minDate = jobValue.start;
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
export function buildOdhResources(values: OdhFormValues): Observation[] {
	return [
		...buildEmploymentStatusResources(values),
		...buildCurrentJobResources(values),
		...buildPastJobResources(values),
		...buildRetirementDateResources(values),
		...buildCombatPeriodResources(values)
	];
}
