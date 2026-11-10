import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import type { Observation } from 'fhir/r4';
import OdhForm from '$lib/components/OdhForm.svelte';
import { SCENARIOS, fixturePath } from './scenarios.js';

// The form as a user meets it: seeded from existing resources (or empty), saved without edits.
// Output must match the fixtures captured from the main app before extraction.

async function renderAndSave(resources?: Observation[]) {
	const onsave = vi.fn();
	render(OdhForm, { props: { resources, onsave } });
	await fireEvent.click(screen.getByRole('button', { name: 'Save work info' }));
	expect(onsave).toHaveBeenCalledTimes(1);
	return onsave.mock.calls[0][0] as Observation[];
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('OdhForm', () => {
	for (const scenario of SCENARIOS) {
		it(`saves resources matching the ${scenario.name} fixture (${scenario.description})`, async () => {
			const resources = await renderAndSave(scenario.resources);
			await expect(JSON.stringify(resources, null, 2) + '\n').toMatchFileSnapshot(
				fixturePath(scenario.name)
			);
		});
	}

	it('hides current jobs unless employed', async () => {
		render(OdhForm, {});
		expect(screen.getByText('I work as a(n):')).toBeInTheDocument();
		await fireEvent.change(screen.getByDisplayValue('Employed'), {
			target: { value: 'Unemployed' }
		});
		expect(screen.queryByText('I work as a(n):')).not.toBeInTheDocument();
	});

	it('shows the busy state while processing', () => {
		render(OdhForm, { props: { processing: true } });
		expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
	});

	it("saves manually entered text under each field's not-coded code when coding fails", async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: false, status: 502, text: async () => 'Bad Gateway' }))
		);
		const onsave = vi.fn();
		render(OdhForm, { props: { onsave } });

		await fireEvent.input(screen.getByPlaceholderText('Search occupation...'), {
			target: { value: 'night nurse' }
		});
		await screen.findByText('Coding service unavailable. Please enter occupation manually.');
		await fireEvent.input(screen.getByPlaceholderText('Search industry...'), {
			target: { value: 'county hospital' }
		});
		await screen.findByText('Coding service unavailable. Please enter industry manually.');
		await fireEvent.click(screen.getByRole('button', { name: 'Save work info' }));

		const job = (onsave.mock.calls[0][0] as Observation[]).find((r) => r.id === 'odh-current-job-0');
		expect(job?.valueCodeableConcept?.coding?.[0]).toMatchObject({
			code: '00-0000',
			display: 'night nurse'
		});
		expect(job?.component?.[0].valueCodeableConcept?.coding?.[0]).toMatchObject({
			code: '000000',
			display: 'county hospital'
		});
	});

	it('sends autocoder requests to the given endpoint with the given token', async () => {
		const fetch = vi.fn(async (_url: string, _init?: RequestInit) => ({
			ok: true,
			status: 200,
			text: async () => JSON.stringify({ Industry: [], Occupation: [], Scheme: '' })
		}));
		vi.stubGlobal('fetch', fetch);
		render(OdhForm, {
			props: { endpoint: '/custom/coder', getAccessToken: async () => 'token-123' }
		});

		await fireEvent.input(screen.getByPlaceholderText('Search occupation...'), {
			target: { value: 'nurse' }
		});

		await waitFor(() => expect(fetch).toHaveBeenCalled());
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe('/custom/coder?o=nurse&c=0');
		expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
	});
});
