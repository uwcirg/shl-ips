import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import AutocoderInput from '$lib/components/AutocoderInput.svelte';

// Typing sends the text to the app's endpoint, suggestions appear, and picking one sets the
// value. A failed request falls back to manual entry.

const suggestions = {
	Industry: [],
	Occupation: [
		{ Code: '29-1141', Title: 'Registered Nurses', Score: 0.97 },
		{ Code: '29-2061', Title: 'Licensed Practical and Licensed Vocational Nurses', Score: 0.4 },
		{ Code: '00-0000', Title: 'Not Coded – Occupation', Score: 0.01 }
	],
	Scheme: 'NAICS 2017 and SOC 2018'
};

function mockFetch(response: { ok: boolean; status: number; body: string }) {
	const fetch = vi.fn(async (_url: string, _init?: RequestInit) => ({
		ok: response.ok,
		status: response.status,
		text: async () => response.body
	}));
	vi.stubGlobal('fetch', fetch);
	return fetch;
}

function renderInput(props: Record<string, unknown> = {}) {
	return render(AutocoderInput, {
		props: { mode: 'Occupation', value: undefined, id: 'occ', ...props }
	});
}

async function type(text: string, mode = 'occupation') {
	await fireEvent.input(screen.getByPlaceholderText(`Search ${mode}...`), {
		target: { value: text }
	});
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('AutocoderInput', () => {
	it('starts out using the not-coded value', () => {
		renderInput();
		expect(screen.getByText('Using "Not Coded – Occupation"')).toBeInTheDocument();
	});

	it('fetches suggestions as the user types and applies the chosen one', async () => {
		const fetch = mockFetch({ ok: true, status: 200, body: JSON.stringify(suggestions) });
		renderInput({ getAccessToken: async () => 'access-token-1' });

		await type('nurse');

		await waitFor(() => expect(fetch).toHaveBeenCalled());
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe('/api/nio-autocoder?o=nurse&c=0');
		expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer access-token-1');

		const option = await screen.findByTitle('Licensed Practical and Licensed Vocational Nurses');
		await fireEvent.click(option);

		expect(
			screen.getByText('Using "Licensed Practical and Licensed Vocational Nurses"')
		).toBeInTheDocument();
	});

	it('codes industries with the i parameter at a custom endpoint', async () => {
		const fetch = mockFetch({
			ok: true,
			status: 200,
			body: JSON.stringify({ ...suggestions, Industry: [{ Code: '622000', Title: 'Hospitals', Score: 1 }] })
		});
		renderInput({ mode: 'Industry', endpoint: '/coder' });

		await type('hospital', 'industry');

		await waitFor(() => expect(fetch).toHaveBeenCalled());
		expect(fetch.mock.calls[0][0]).toBe('/coder?i=hospital&c=0');
		expect(await screen.findByTitle('Hospitals')).toBeInTheDocument();
	});

	it('sends no Authorization header without getAccessToken', async () => {
		const fetch = mockFetch({ ok: true, status: 200, body: JSON.stringify(suggestions) });
		renderInput();

		await type('nurse');

		await waitFor(() => expect(fetch).toHaveBeenCalled());
		expect(fetch.mock.calls[0][1]?.headers).toEqual({});
	});

	it('falls back to manual entry when the coding service fails', async () => {
		mockFetch({ ok: false, status: 502, body: 'Bad Gateway' });
		renderInput();

		await type('nurse');

		expect(
			await screen.findByText('Coding service unavailable. Please enter occupation manually.')
		).toBeInTheDocument();
		expect(screen.getByText('Using "nurse"')).toBeInTheDocument();
	});
});
