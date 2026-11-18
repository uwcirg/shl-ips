import { describe, expect, it } from 'vitest';
import {
	buildCombatPeriods,
	buildCurrentJob,
	buildOdhResources,
	buildPastJobs,
	buildRetirementDates,
	defaultOdhFormValues,
	NOT_CODED,
	readOdhValues
} from '$lib';
import { SCENARIOS, counterIds, fixturePath } from './scenarios.js';

const NURSE = { Code: '29-1141', Title: 'Registered Nurses', Score: 1 };
const HOSPITALS = { Code: '622000', Title: 'General Medical and Surgical Hospitals', Score: 1 };

describe('buildOdhResources', () => {
	for (const scenario of SCENARIOS) {
		it(`matches the ${scenario.name} fixture (${scenario.description})`, async () => {
			const values = readOdhValues(scenario.resources, { createId: counterIds() });
			const resources = buildOdhResources(values);
			await expect(JSON.stringify(resources, null, 2) + '\n').toMatchFileSnapshot(
				fixturePath(scenario.name)
			);
		});
	}

	it('is deterministic', () => {
		const scenario = SCENARIOS.find((s) => s.name === 'round-trip')!;
		const build = () => buildOdhResources(readOdhValues(scenario.resources, { createId: counterIds() }));
		expect(build()).toEqual(build());
	});

	it('gives resources no id when their entries have none', () => {
		const scenario = SCENARIOS.find((s) => s.name === 'round-trip')!;
		const values = readOdhValues(scenario.resources, { getId: () => undefined });
		const resources = buildOdhResources(values);
		expect(resources.length).toBeGreaterThan(5);
		expect(resources.every((r) => !('id' in r))).toBe(true);
	});

	it('leaves out the subject unless one is given', () => {
		const resources = buildOdhResources(readOdhValues(SCENARIOS[1].resources));
		expect(resources.every((r) => !('subject' in r))).toBe(true);
	});

	it('adds the given subject to every resource, after code', () => {
		const subject = { reference: 'Patient/123', display: 'Pat' };
		const resources = buildOdhResources(readOdhValues(SCENARIOS[1].resources), { subject });
		expect(resources.length).toBeGreaterThan(5);
		for (const resource of resources) {
			expect(resource.subject).toEqual(subject);
			expect(resource.subject).not.toBe(subject);
			const keys = Object.keys(resource);
			expect(keys.indexOf('subject')).toBe(keys.indexOf('code') + 1);
		}
	});

	it('builds only the given sections', () => {
		const values = readOdhValues(SCENARIOS[1].resources);
		const resources = buildOdhResources(values, { sections: ['employmentStatus', 'pastWork'] });
		expect(resources.map((r) => r.code?.coding?.[0].code)).toEqual(['74165-2', '11341-5', '11341-5']);
		// Without current work, nothing dates the employment status
		expect(resources[0].effectivePeriod).toBeUndefined();
	});

	it('does not modify the templates', () => {
		const values = defaultOdhFormValues();
		values.currentWork[0].occupation = NURSE;
		buildOdhResources(values);
		const fresh = buildOdhResources(defaultOdhFormValues());
		expect(fresh[1].valueCodeableConcept?.coding?.[0].code).toBe(NOT_CODED.Occupation[0].Code);
	});
});

describe('entry and section builders', () => {
	it('saves an uncoded occupation and industry as not coded', () => {
		const resource = buildCurrentJob({ start: '' });
		expect(resource.valueCodeableConcept?.coding?.[0]).toMatchObject({
			code: '00-0000',
			display: NOT_CODED.Occupation[0].Title
		});
		expect(resource.component?.[0].valueCodeableConcept?.coding?.[0]).toMatchObject({
			code: '000000',
			display: NOT_CODED.Industry[0].Title
		});
	});

	it("uses the entry's id, and leaves it out when there is none", () => {
		expect(buildCurrentJob({ id: 'job-a', occupation: NURSE, start: '' }).id).toBe('job-a');
		expect('id' in buildCurrentJob({ occupation: NURSE, start: '' })).toBe(false);
	});

	it("leaves out duplicates, keeping the first entry's id, whatever their key order", () => {
		const resources = buildPastJobs([
			{ id: 'first', occupation: NURSE, industry: HOSPITALS, start: '2010-01', end: '2012-01' },
			{
				end: '2012-01',
				start: '2010-01',
				industry: { Score: 1, Title: HOSPITALS.Title, Code: HOSPITALS.Code },
				occupation: { Title: NURSE.Title, Code: NURSE.Code, Score: 1 },
				id: 'second'
			}
		]);
		expect(resources.map((r) => r.id)).toEqual(['first']);
	});

	it('leaves out empty retirement dates and combat periods', () => {
		expect(buildRetirementDates([{ id: 'a', start: '' }, { id: 'b', start: '2015' }])).toHaveLength(1);
		expect(buildCombatPeriods([{ start: '', end: '' }, { start: '', end: '2006-08' }])).toHaveLength(1);
	});
});

describe('readOdhValues', () => {
	it('gives a new form for no resources, with ids from createId', () => {
		expect(readOdhValues([], { createId: counterIds() })).toEqual({
			employmentStatus: { id: 'id-1', status: 'Employed' },
			currentWork: [{ id: 'id-2', start: '' }],
			pastWork: [],
			retirementDates: [],
			combatPeriods: []
		});
	});

	it('reads ids with getId, defaulting to resource ids', () => {
		const scenario = SCENARIOS.find((s) => s.name === 'round-trip')!;
		expect(readOdhValues(scenario.resources).pastWork.map((job) => job.id)).toEqual([
			'seed-2',
			'seed-3'
		]);
		const values = readOdhValues(scenario.resources, { getId: (r) => r.id && `source-${r.id}` });
		expect(values.currentWork.map((job) => job.id)).toEqual(['source-seed-0', 'source-seed-1']);
	});
});
