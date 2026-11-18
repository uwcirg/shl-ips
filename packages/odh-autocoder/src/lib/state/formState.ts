import { derived, get, writable, type Readable, type Writable } from 'svelte/store';
import type { Observation } from 'fhir/r4';
import { buildOdhResources, type OdhFormBuildOptions } from '../fhir/build.js';
import { readOdhValues, type OdhReadOptions } from '../fhir/parse.js';
import {
	blankEntry,
	isWorking,
	type OdhEntry,
	type OdhFormValues,
	type OdhIdOptions,
	type OdhListSectionKey
} from '../fhir/values.js';

export interface OdhFormStateOptions extends OdhReadOptions, OdhIdOptions {
	/** Existing ODH resources to start from; a new form's defaults when not given */
	resources?: Observation[];
}

/**
 * The ODH form's values and the actions on them, with no UI. A writable store, so components
 * can bind to its entries ($state.pastWork[0].start).
 */
export interface OdhFormState extends Writable<OdhFormValues> {
	/** Whether current jobs apply (the status is Employed) */
	isWorking: Readable<boolean>;
	/** Adds a blank entry to a list section and returns it */
	add<K extends OdhListSectionKey>(section: K): OdhEntry<K>;
	/** Removes an entry from a list section */
	remove<K extends OdhListSectionKey>(section: K, entry: OdhEntry<K>): void;
	/** Sets the employment status (there's always exactly one) */
	setStatus(status: string): void;
	/** Replaces the values with those read from resources, and resets to them from now on */
	load(resources?: Observation[]): void;
	/** Back to the last loaded resources, or a new form's defaults */
	reset(): void;
	/** Changes how ids are made and read, for entries added or loaded from now on */
	configure(options: OdhReadOptions & OdhIdOptions): void;
	/** The FHIR resources for the current values */
	toResources(options?: OdhFormBuildOptions): Observation[];
}

export function createOdhFormState({ resources, ...options }: OdhFormStateOptions = {}): OdhFormState {
	let idOptions: OdhReadOptions & OdhIdOptions = options;
	let loaded = resources;
	const store = writable<OdhFormValues>(readOdhValues(loaded, idOptions));

	return {
		...store,
		isWorking: derived(store, isWorking),
		add(section) {
			const entry = blankEntry(section, idOptions);
			store.update((values) => {
				(values[section] as OdhEntry<typeof section>[]).push(entry);
				return values;
			});
			return entry;
		},
		remove(section, entry) {
			store.update((values) => {
				const entries = values[section] as OdhEntry<typeof section>[];
				const index = entries.indexOf(entry);
				if (index >= 0) {
					entries.splice(index, 1);
				}
				return values;
			});
		},
		setStatus(status) {
			store.update((values) => {
				values.employmentStatus = { ...values.employmentStatus, status };
				return values;
			});
		},
		load(resources) {
			loaded = resources;
			store.set(readOdhValues(loaded, idOptions));
		},
		reset() {
			store.set(readOdhValues(loaded, idOptions));
		},
		configure(options) {
			idOptions = { ...idOptions, ...options };
		},
		toResources(options) {
			return buildOdhResources(get(store), options);
		}
	};
}
