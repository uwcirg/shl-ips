import type { IOResponse } from '../types.js';

/** Employment status choices, mapped to their v3-ObservationValue codes */
export const EMPLOYMENT_STATUSES: Record<string, string> = {
	Employed: 'Employed',
	Unemployed: 'Unemployed',
	'Not in labor force': 'NotInLaborForce'
};

export interface CurrentJobValues {
	occupation: IOResponse | undefined;
	industry: IOResponse | undefined;
	/** "YYYY-MM", or "" */
	start: string;
}

export interface PastJobValues extends CurrentJobValues {
	/** "YYYY-MM", or "" */
	end: string;
}

export interface RetirementDateValues {
	start: string;
}

export interface CombatPeriodValues {
	start: string;
	end: string;
}

/** The ODH form's state, from which the FHIR resources are built */
export interface OdhFormValues {
	/** A key of EMPLOYMENT_STATUSES */
	status: string;
	/** Whether current jobs are included; true when status is Employed */
	isWorking: boolean;
	wasWorkingPast: boolean;
	isRetired: boolean;
	wasInCombat: boolean;
	currentWork: CurrentJobValues[];
	pastWork: PastJobValues[];
	retirementDates: RetirementDateValues[];
	combatPeriods: CombatPeriodValues[];
}

/** Blank entries for each repeating section */
export const ODH_BLANK_ENTRIES = {
	currentWork: {
		occupation: undefined,
		industry: undefined,
		start: ''
	} as CurrentJobValues,
	pastWork: {
		occupation: undefined,
		industry: undefined,
		start: '',
		end: ''
	} as PastJobValues,
	retirementDate: {
		start: ''
	} as RetirementDateValues,
	combatPeriod: {
		start: '',
		end: ''
	} as CombatPeriodValues
};

const DEFAULT_VALUES: OdhFormValues = {
	status: 'Employed',
	isWorking: true,
	wasWorkingPast: false,
	isRetired: false,
	wasInCombat: false,
	currentWork: [ODH_BLANK_ENTRIES.currentWork],
	pastWork: [],
	retirementDates: [],
	combatPeriods: []
};

/**
 * Deep copy through JSON. Properties holding undefined are dropped, which affects key order
 * when they are set again later; the duplicate detection in the builders depends on it.
 */
export function copyOf<T>(a: T): T {
	return JSON.parse(JSON.stringify(a));
}

/** A fresh copy of the form's default values: employed, with one blank current job */
export function defaultOdhFormValues(): OdhFormValues {
	return copyOf(DEFAULT_VALUES);
}
