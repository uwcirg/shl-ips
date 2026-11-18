import type { IOResponse } from '../types.js';

/** Employment status choices, mapped to their v3-ObservationValue codes */
export const EMPLOYMENT_STATUSES: Record<string, string> = {
	Employed: 'Employed',
	Unemployed: 'Unemployed',
	'Not in labor force': 'NotInLaborForce'
};

// Each entry becomes one FHIR resource. id is optional and comes from the app (see OdhIdOptions):
// when set, it's the resource's id, so the app can match a saved resource to the one it was
// read from.

export interface EmploymentStatusEntry {
	id?: string;
	/** A key of EMPLOYMENT_STATUSES */
	status: string;
}

export interface CurrentJobEntry {
	id?: string;
	/** Undefined when not coded; saved as the not-coded occupation */
	occupation?: IOResponse;
	/** Undefined when not coded; saved as the not-coded industry */
	industry?: IOResponse;
	/** "YYYY-MM", "YYYY", or "" */
	start: string;
}

export interface PastJobEntry extends CurrentJobEntry {
	/** "YYYY-MM", "YYYY", or "" */
	end: string;
}

export interface RetirementDateEntry {
	id?: string;
	/** "YYYY-MM", "YYYY", or "" */
	start: string;
}

export interface CombatPeriodEntry {
	id?: string;
	start: string;
	end: string;
}

/** The ODH form's state, from which the FHIR resources are built */
export interface OdhFormValues {
	/** Always exactly one */
	employmentStatus: EmploymentStatusEntry;
	currentWork: CurrentJobEntry[];
	pastWork: PastJobEntry[];
	retirementDates: RetirementDateEntry[];
	combatPeriods: CombatPeriodEntry[];
}

export type OdhSectionKey = keyof OdhFormValues;
/** Sections holding a list of entries */
export type OdhListSectionKey = Exclude<OdhSectionKey, 'employmentStatus'>;
export type OdhEntry<K extends OdhListSectionKey> = OdhFormValues[K][number];

/** All sections, in the order their resources are built */
export const ODH_SECTIONS: readonly OdhSectionKey[] = [
	'employmentStatus',
	'currentWork',
	'pastWork',
	'retirementDates',
	'combatPeriods'
];

export interface OdhIdOptions {
	/**
	 * Makes an id for each new entry (added, or a new form's defaults). Without it, new entries
	 * and their resources have no id.
	 */
	createId?: () => string;
}

const BLANK_ENTRIES: { [K in OdhListSectionKey]: () => OdhEntry<K> } = {
	currentWork: () => ({ start: '' }),
	pastWork: () => ({ start: '', end: '' }),
	retirementDates: () => ({ start: '' }),
	combatPeriods: () => ({ start: '', end: '' })
};

function withId<T extends object>(entry: T, { createId }: OdhIdOptions): T & { id?: string } {
	return createId ? { id: createId(), ...entry } : entry;
}

/** A new, empty entry for a list section */
export function blankEntry<K extends OdhListSectionKey>(
	section: K,
	options: OdhIdOptions = {}
): OdhEntry<K> {
	return withId(BLANK_ENTRIES[section](), options) as OdhEntry<K>;
}

/** A new employment status entry */
export function employmentStatusEntry(status = 'Employed', options: OdhIdOptions = {}) {
	return withId({ status }, options) as EmploymentStatusEntry;
}

/** A new form's values: employed, with one blank current job */
export function defaultOdhFormValues(options: OdhIdOptions = {}): OdhFormValues {
	return {
		employmentStatus: employmentStatusEntry('Employed', options),
		currentWork: [blankEntry('currentWork', options)],
		pastWork: [],
		retirementDates: [],
		combatPeriods: []
	};
}

/** Current jobs only apply (are shown and saved) while the status is Employed */
export function isWorking(values: Pick<OdhFormValues, 'employmentStatus'>): boolean {
	return values.employmentStatus.status === 'Employed';
}

/** Deep copy through JSON (entries hold only JSON values) */
export function copyOf<T>(a: T): T {
	return JSON.parse(JSON.stringify(a));
}
