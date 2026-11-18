// Client-safe entry point. Server-only code lives in ./server and is exported as
// 'odh-autocoder/server'.

// Forms: a ready-made layout, and the provider for building your own
export { default as OdhForm } from './components/OdhForm.svelte';
export { default as OdhFormProvider } from './components/OdhFormProvider.svelte';

// Sections (inside an OdhFormProvider, or standalone with bind:entries / bind:entry)
export { default as EmploymentStatusSection } from './components/sections/EmploymentStatusSection.svelte';
export { default as CurrentWorkSection } from './components/sections/CurrentWorkSection.svelte';
export { default as PastWorkSection } from './components/sections/PastWorkSection.svelte';
export { default as RetirementDateSection } from './components/sections/RetirementDateSection.svelte';
export { default as CombatPeriodSection } from './components/sections/CombatPeriodSection.svelte';

// Entry forms: the fields for one entry
export { default as CurrentJobForm } from './components/entries/CurrentJobForm.svelte';
export { default as PastJobForm } from './components/entries/PastJobForm.svelte';
export { default as RetirementDateForm } from './components/entries/RetirementDateForm.svelte';
export { default as CombatPeriodForm } from './components/entries/CombatPeriodForm.svelte';

// Coders: job coders (occupation + industry) and field coders (one field)
export { default as JobFieldsCoder } from './components/coders/JobFieldsCoder.svelte';
/** Experimental: one description coded as both occupation and industry */
export { default as JobDescriptionCoder } from './components/coders/JobDescriptionCoder.svelte';
export { default as AutocoderSearchInput } from './components/coders/AutocoderSearchInput.svelte';
/** @deprecated Renamed AutocoderSearchInput */
export { default as AutocoderInput } from './components/coders/AutocoderSearchInput.svelte';
export { default as MonthInput } from './components/MonthInput.svelte';

export {
	createAutocoderClient,
	getAutocoderClient,
	setAutocoderClient,
	isNotCoded,
	notCoded,
	withoutNotCoded,
	DEFAULT_AUTOCODER_ENDPOINT,
	type AutocoderClient,
	type AutocoderClientOptions,
	type AutocoderQuery
} from './autocoder/client.js';
export { createOdhFormState, type OdhFormState, type OdhFormStateOptions } from './state/formState.js';
export { getOdhFormContext, type OdhFormContext } from './state/context.js';
export * from './fhir/index.js';
export { NOT_CODED, type AutocoderResponse, type CodingMode, type IOResponse } from './types.js';
