import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import type { Observation } from 'fhir/r4';
import OdhForm from '$lib/components/OdhForm.svelte';
import JobDescriptionCoder from '$lib/components/coders/JobDescriptionCoder.svelte';

// The experimental job coder, used through the form: one description, one request coding it as
// both occupation and industry, then a pick from each list.

const RESPONSE = {
	Occupation: [
		{ Code: '29-1141', Title: 'Registered Nurses', Score: 0.9 },
		{ Code: '29-2061', Title: 'Licensed Practical Nurses', Score: 0.3 },
		{ Code: '00-0000', Title: 'Not Coded – Occupation', Score: 0.1 }
	],
	Industry: [
		{ Code: '622000', Title: 'Hospitals', Score: 0.8 },
		{ Code: '621000', Title: 'Ambulatory Health Care Services', Score: 0.2 }
	],
	Scheme: 'NAICS 2017 and SOC 2018'
};

function mockFetch(ok = true) {
	const fetch = vi.fn(async (_url: string, _init?: RequestInit) => ({
		ok,
		status: ok ? 200 : 502,
		text: async () => (ok ? JSON.stringify(RESPONSE) : 'Bad Gateway')
	}));
	vi.stubGlobal('fetch', fetch);
	return fetch;
}

async function describeJob(text: string) {
	await fireEvent.input(screen.getByLabelText('Describe your job and where you work:'), {
		target: { value: text }
	});
	await fireEvent.click(screen.getByRole('button', { name: 'Find codes' }));
}

async function saveJob(onsave: ReturnType<typeof vi.fn>) {
	await fireEvent.click(screen.getByRole('button', { name: 'Save work info' }));
	const saved = onsave.mock.calls.at(-1)![0] as Observation[];
	const job = saved.find((r) => r.code?.coding?.[0].code === '11341-5')!;
	return {
		occupation: job.valueCodeableConcept?.coding?.[0],
		industry: job.component?.[0].valueCodeableConcept?.coding?.[0]
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('JobDescriptionCoder', () => {
	it('codes the description as occupation and industry in one request', async () => {
		const fetch = mockFetch();
		const onsave = vi.fn();
		render(OdhForm, { props: { onsave, jobCoder: JobDescriptionCoder, endpoint: '/coder' } });

		await describeJob('night nurse at a hospital');

		await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
		expect(fetch.mock.calls[0][0]).toBe(
			'/coder?o=night%20nurse%20at%20a%20hospital&i=night%20nurse%20at%20a%20hospital&c=0'
		);
		// The top suggestions are picked to start with
		expect(await screen.findByLabelText('Registered Nurses')).toBeChecked();
		expect(screen.getByLabelText('Hospitals')).toBeChecked();
		expect(await saveJob(onsave)).toMatchObject({
			occupation: { code: '29-1141' },
			industry: { code: '622000' }
		});
	});

	it('saves the suggestions the user picks', async () => {
		mockFetch();
		const onsave = vi.fn();
		render(OdhForm, { props: { onsave, jobCoder: JobDescriptionCoder } });

		await describeJob('nurse');
		await fireEvent.click(await screen.findByLabelText('Licensed Practical Nurses'));
		await fireEvent.click(screen.getByLabelText('Not Coded – Industry'));

		expect(await saveJob(onsave)).toMatchObject({
			occupation: { code: '29-2061' },
			industry: { code: '000000' }
		});
	});

	it('keeps the description under the not-coded codes when coding fails', async () => {
		mockFetch(false);
		const onsave = vi.fn();
		render(OdhForm, { props: { onsave, jobCoder: JobDescriptionCoder } });

		await describeJob('night nurse');

		expect(await screen.findByText(/Coding service unavailable/)).toBeInTheDocument();
		expect(await saveJob(onsave)).toMatchObject({
			occupation: { code: '00-0000', display: 'night nurse' },
			industry: { code: '000000', display: 'night nurse' }
		});
	});
});
