import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import NIOAutoCoderInput from '$lib/components/form/NIOAutoCoderInput.svelte';
import { fakeAuth } from '$lib/test/mocks';

// Characterization tests for the autocoder input: typing sends the text to the app's own
// endpoint with the user's token, suggestions appear, and picking one sets the value.

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
  const fetch = vi.fn(async () => ({
    ok: response.ok,
    status: response.status,
    text: async () => response.body
  }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function renderInput(mode: 'Occupation' | 'Industry' = 'Occupation') {
  return render(NIOAutoCoderInput, {
    props: { mode, value: undefined, id: 'occ' },
    context: new Map([['authService', fakeAuth()]])
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('NIOAutoCoderInput', () => {
  it('starts out using the not-coded value', () => {
    renderInput();
    expect(screen.getByText('Using "Not Coded – Occupation"')).toBeInTheDocument();
  });

  it('fetches suggestions as the user types and applies the chosen one', async () => {
    const fetch = mockFetch({ ok: true, status: 200, body: JSON.stringify(suggestions) });
    renderInput();

    await fireEvent.input(screen.getByPlaceholderText('Search occupation...'), {
      target: { value: 'nurse' }
    });

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/nio-autocoder?o=nurse&c=0');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-token-1');

    const option = await screen.findByTitle('Licensed Practical and Licensed Vocational Nurses');
    await fireEvent.click(option);

    expect(
      screen.getByText('Using "Licensed Practical and Licensed Vocational Nurses"')
    ).toBeInTheDocument();
  });

  it('falls back to manual entry when the coding service fails', async () => {
    mockFetch({ ok: false, status: 502, body: 'Bad Gateway' });
    renderInput();

    await fireEvent.input(screen.getByPlaceholderText('Search occupation...'), {
      target: { value: 'nurse' }
    });

    expect(
      await screen.findByText('Coding service unavailable. Please enter occupation manually.')
    ).toBeInTheDocument();
    expect(screen.getByText('Using "nurse"')).toBeInTheDocument();
  });
});
