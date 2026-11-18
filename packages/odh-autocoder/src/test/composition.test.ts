import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import type { Observation } from 'fhir/r4';
import OdhForm from '$lib/components/OdhForm.svelte';
import CustomLayout from './harness/CustomLayout.svelte';
import StubJobCoder from './harness/StubJobCoder.svelte';
import StandaloneSection from './harness/StandaloneSection.svelte';
import { SCENARIOS, counterIds } from './scenarios.js';

// The pieces of the form used separately: an app's own layout around the provider, swapped
// coders, and a section on its own.

const roundTrip = SCENARIOS.find((s) => s.name === 'round-trip')!.resources!;
const codeOf = (r: Observation) => r.code?.coding?.[0].code;

describe('OdhFormProvider with an app layout', () => {
	it('saves only the sections in the layout', async () => {
		const onsave = vi.fn();
		render(CustomLayout, { props: { resources: roundTrip, onsave } });
		await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
		const saved = onsave.mock.calls[0][0] as Observation[];
		// Employment status (undated: current work isn't in the layout) and the two past jobs
		expect(saved.map(codeOf)).toEqual(['74165-2', '11341-5', '11341-5']);
		expect(saved[0].effectivePeriod).toBeUndefined();
		expect(saved.slice(1).map((r) => r.id)).toEqual(['seed-2', 'seed-3']);
	});

	it("keeps each entry's id when another is deleted", async () => {
		const onsave = vi.fn();
		render(CustomLayout, { props: { resources: roundTrip, onsave } });
		await fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
		const jobs = (onsave.mock.calls[0][0] as Observation[]).filter((r) => codeOf(r) === '11341-5');
		expect(jobs.map((r) => r.id)).toEqual(['seed-3']);
	});

	it('gives added entries ids from createId', async () => {
		const onsave = vi.fn();
		render(CustomLayout, { props: { onsave, createId: counterIds() } });
		await fireEvent.click(screen.getByRole('button', { name: /Add a past job/ }));
		await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
		const saved = onsave.mock.calls[0][0] as Observation[];
		expect(saved.map((r) => r.id)).toEqual(['id-1', 'id-3']);
	});

	it('resets to the resources being edited', async () => {
		const onsave = vi.fn();
		render(CustomLayout, { props: { resources: roundTrip, onsave } });
		await fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
		expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
	});

	it('reports the same section shown twice', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		render(CustomLayout, { props: { onsave: vi.fn(), duplicateSection: true } });
		expect(error).toHaveBeenCalledWith(expect.stringMatching(/pastWork section is already in this form/));
		error.mockRestore();
	});
});

describe('swapping coders', () => {
	it('uses the given job coder for every job', async () => {
		const onsave = vi.fn();
		render(OdhForm, { props: { onsave, jobCoder: StubJobCoder } });
		expect(screen.queryByPlaceholderText('Search occupation...')).not.toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Code as nurse' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Save work info' }));
		const job = (onsave.mock.calls[0][0] as Observation[]).find((r) => codeOf(r) === '11341-5');
		expect(job?.valueCodeableConcept?.coding?.[0].code).toBe('29-1141');
		expect(job?.component?.[0].valueCodeableConcept?.coding?.[0].code).toBe('622000');
	});

	it('shows only the given sections', () => {
		render(OdhForm, { props: { sections: ['pastWork', 'retirementDates'] } });
		expect(screen.queryByText('I am currently:')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Add a past job/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Add a retirement date/ })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /combat period/ })).not.toBeInTheDocument();
	});
});

describe('a section on its own', () => {
	it('edits the entries bound to it', async () => {
		render(StandaloneSection, { props: { createId: counterIds() } });
		await fireEvent.click(screen.getByRole('button', { name: /Add a past job/ }));
		await fireEvent.click(screen.getByRole('button', { name: /Add another past job/ }));
		await fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
		expect(JSON.parse(screen.getByTestId('entries').textContent!)).toEqual([
			{ id: 'id-2', start: '', end: '' }
		]);
	});
});
