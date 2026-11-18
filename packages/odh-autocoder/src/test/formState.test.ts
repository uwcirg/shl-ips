import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { createOdhFormState } from '$lib';
import { SCENARIOS, counterIds } from './scenarios.js';

const roundTrip = SCENARIOS.find((s) => s.name === 'round-trip')!.resources!;

describe('createOdhFormState', () => {
	it('starts as a new form, with ids from createId', () => {
		const state = createOdhFormState({ createId: counterIds() });
		expect(get(state).employmentStatus).toEqual({ id: 'id-1', status: 'Employed' });
		expect(get(state).currentWork).toEqual([{ id: 'id-2', start: '' }]);
		expect(get(state.isWorking)).toBe(true);
	});

	it('adds blank entries with new ids, and removes entries', () => {
		const state = createOdhFormState({ createId: counterIds() });
		const first = state.add('pastWork');
		const second = state.add('pastWork');
		expect(get(state).pastWork).toEqual([
			{ id: 'id-3', start: '', end: '' },
			{ id: 'id-4', start: '', end: '' }
		]);
		state.remove('pastWork', first);
		expect(get(state).pastWork).toEqual([second]);
	});

	it('adds entries without ids when there is no createId', () => {
		const state = createOdhFormState();
		expect(state.add('combatPeriods')).toEqual({ start: '', end: '' });
	});

	it('has exactly one employment status', () => {
		const state = createOdhFormState();
		state.setStatus('Unemployed');
		expect(get(state).employmentStatus.status).toBe('Unemployed');
		expect(get(state.isWorking)).toBe(false);
	});

	it('loads resources with getId, and resets to them', () => {
		const state = createOdhFormState({ getId: (r) => r.id && `source-${r.id}` });
		state.load(roundTrip);
		expect(get(state).pastWork.map((job) => job.id)).toEqual(['source-seed-2', 'source-seed-3']);

		state.remove('pastWork', get(state).pastWork[0]);
		state.setStatus('Unemployed');
		state.reset();
		expect(get(state).pastWork).toHaveLength(2);
		expect(get(state).employmentStatus.status).toBe('Employed');
	});

	it('builds resources for the given sections', () => {
		const state = createOdhFormState({ resources: roundTrip });
		const all = state.toResources();
		const past = state.toResources({ sections: ['pastWork'] });
		expect(all.length).toBe(8);
		expect(past.map((r) => r.id)).toEqual(['seed-2', 'seed-3']);
	});
});
