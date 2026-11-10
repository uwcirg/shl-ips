import { describe, expect, it } from 'vitest';
import { applyOdhResources, buildOdhResources, defaultOdhFormValues, NOT_CODED } from '$lib';
import { SCENARIOS, fixturePath } from './scenarios.js';

// The form's values as they stand when the user saves without editing: seeded from existing
// resources, with the form's reactive rules applied.
function formValuesFor(resources: Parameters<typeof applyOdhResources>[1] | undefined) {
	const values = defaultOdhFormValues();
	if (resources) {
		applyOdhResources(values, resources);
	}
	// The form only includes current jobs when the status is Employed
	values.isWorking = values.status === 'Employed';
	// Each rendered autocoder input sets an empty value to its not-coded default when it mounts.
	// Current jobs are only rendered while working.
	const renderedJobs = [...(values.isWorking ? values.currentWork : []), ...values.pastWork];
	for (const job of renderedJobs) {
		job.occupation ??= NOT_CODED.Occupation[0];
		job.industry ??= NOT_CODED.Industry[0];
	}
	return values;
}

describe('buildOdhResources', () => {
	for (const scenario of SCENARIOS) {
		it(`matches the ${scenario.name} fixture (${scenario.description})`, async () => {
			const resources = buildOdhResources(formValuesFor(scenario.resources));
			await expect(JSON.stringify(resources, null, 2) + '\n').toMatchFileSnapshot(
				fixturePath(scenario.name)
			);
		});
	}

	it('is deterministic', () => {
		const scenario = SCENARIOS.find((s) => s.name === 'round-trip')!;
		const first = buildOdhResources(formValuesFor(scenario.resources));
		const second = buildOdhResources(formValuesFor(scenario.resources));
		expect(second).toEqual(first);
	});

	it('does not modify the templates', () => {
		const values = defaultOdhFormValues();
		values.currentWork[0].occupation = { Code: '29-1141', Title: 'Registered Nurses', Score: 1 };
		buildOdhResources(values);
		const fresh = buildOdhResources(defaultOdhFormValues());
		expect(fresh[1].valueCodeableConcept?.coding).toEqual([]);
	});
});

describe('applyOdhResources', () => {
	it('leaves values unchanged when there are no resources', () => {
		const values = defaultOdhFormValues();
		values.status = 'Unemployed';
		expect(applyOdhResources(values, [])).toEqual({ ...defaultOdhFormValues(), status: 'Unemployed' });
	});
});
