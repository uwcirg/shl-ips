import { getContext, hasContext, onDestroy, setContext } from 'svelte';
import { ODH_SECTIONS, type OdhSectionKey } from '../fhir/values.js';
import type { OdhFormState } from './formState.js';

// Shared by OdhFormProvider and the sections inside it

export interface OdhFormContext {
	state: OdhFormState;
	/**
	 * Called by a section as it's created. The section stays registered when it's hidden (until
	 * the provider is destroyed). Two instances of a section shown at once is an error.
	 */
	register(section: OdhSectionKey): void;
	/** Sections registered so far, in build order */
	registered(): OdhSectionKey[];
}

const CONTEXT_KEY = Symbol('odh-form');

export function createOdhFormContext(state: OdhFormState): OdhFormContext {
	const registered = new Set<OdhSectionKey>();
	const shown = new Map<OdhSectionKey, number>();
	return {
		state,
		register(section) {
			// Reported rather than thrown: an error while a component is being created leaves Svelte
			// unable to create components afterwards
			if (shown.get(section)) {
				console.error(
					`odh-autocoder: the ${section} section is already in this form; a form can show each section once`
				);
			}
			registered.add(section);
			shown.set(section, (shown.get(section) ?? 0) + 1);
			onDestroy(() => shown.set(section, (shown.get(section) ?? 1) - 1));
		},
		registered: () => ODH_SECTIONS.filter((section) => registered.has(section))
	};
}

export function setOdhFormContext(context: OdhFormContext): OdhFormContext {
	return setContext(CONTEXT_KEY, context);
}

/** The enclosing OdhFormProvider's context, or undefined outside one */
export function getOdhFormContext(): OdhFormContext | undefined {
	return hasContext(CONTEXT_KEY) ? getContext(CONTEXT_KEY) : undefined;
}
