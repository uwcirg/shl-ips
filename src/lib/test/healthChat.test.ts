import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { fakeAuth } from '$lib/test/mocks';
import FHIRDataService from '$lib/utils/FHIRDataService';
import { ResourceCollection } from '$lib/utils/ResourceCollection';

const { CATEGORY_SYSTEM, METHOD_SYSTEM, SOURCE_NAME_SYSTEM, PLACEHOLDER_SYSTEM } = vi.hoisted(() => ({
  CATEGORY_SYSTEM: 'http://test.example.com/category',
  METHOD_SYSTEM: 'http://test.example.com/method',
  SOURCE_NAME_SYSTEM: 'http://test.example.com/source-name',
  PLACEHOLDER_SYSTEM: 'http://test.example.com/placeholder'
}));

vi.mock('$lib/config/config', () => ({
  CATEGORY_SYSTEM,
  METHOD_SYSTEM,
  SOURCE_NAME_SYSTEM,
  PLACEHOLDER_SYSTEM,
  IDENTIFIER_SYSTEM: 'http://keycloak.example.com',
  INTERMEDIATE_FHIR_SERVER_BASE: 'https://fhir.example.com'
}));

import HealthChat from '$lib/components/app/HealthChat.svelte';

function buildService() {
  const fhirDataService = new FHIRDataService(fakeAuth());
  fhirDataService.addDatasetToUserResources(
    new ResourceCollection([
      {
        resourceType: 'Patient',
        id: 'patient-1',
        meta: {
          source: 'test-clinic',
          tag: [
            { system: CATEGORY_SYSTEM, code: 'provider-health-record' },
            { system: METHOD_SYSTEM, code: 'provider-health-record-sof' },
            { system: SOURCE_NAME_SYSTEM, code: 'Test Clinic' },
            { system: PLACEHOLDER_SYSTEM, code: 'placeholder-patient' }
          ]
        }
      },
      { resourceType: 'Condition', id: 'cond-1', code: { text: 'Hypertension' } }
    ] as any)
  );
  return fhirDataService;
}

function renderChat(fhirDataService = buildService()) {
  return render(HealthChat, {
    context: new Map<string, unknown>([
      ['authService', fakeAuth()],
      ['fhirDataService', fhirDataService]
    ])
  });
}

// A minimal AI SDK data stream: one text part, then a finish part
function streamResponse(text: string) {
  return new Response(
    `0:${JSON.stringify(text)}\ne:{"finishReason":"stop","usage":{"promptTokens":1,"completionTokens":1},"isContinued":false}\nd:{"finishReason":"stop","usage":{"promptTokens":1,"completionTokens":1}}\n`,
    { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'x-vercel-ai-data-stream': 'v1' } }
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HealthChat', () => {
  it('sends the question with a bearer token and the serialized record, then shows the answer', async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => streamResponse('You have hypertension.'));
    vi.stubGlobal('fetch', fetch);
    renderChat();

    const input = screen.getByLabelText('Ask about your health data');
    await fireEvent.input(input, { target: { value: 'What conditions do I have?' } });
    await fireEvent.click(screen.getByRole('button', { name: /Send/ }));

    expect(await screen.findByText('You have hypertension.')).toBeInTheDocument();
    expect(screen.getByText('What conditions do I have?')).toBeInTheDocument();

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/health-chat');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer access-token-1');
    const body = JSON.parse(init?.body as string);
    expect(body.messages.at(-1)).toMatchObject({ role: 'user', content: 'What conditions do I have?' });
    expect(body.record).toContain('"id":"cond-1"');
    expect(body.record).not.toContain('placeholder-patient');
  });

  it('submits on Enter', async () => {
    const fetch = vi.fn(async () => streamResponse('ok'));
    vi.stubGlobal('fetch', fetch);
    renderChat();

    const input = screen.getByLabelText('Ask about your health data');
    await fireEvent.input(input, { target: { value: 'Hi' } });
    await fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  });

  it('keeps Send disabled until there is a question', async () => {
    renderChat();

    expect(screen.getByRole('button', { name: /Send/ })).toBeDisabled();
  });

  it('shows the message from an error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ message: 'Chat is not available right now' }), { status: 503 }))
    );
    renderChat();

    await fireEvent.input(screen.getByLabelText('Ask about your health data'), { target: { value: 'Hi' } });
    await fireEvent.click(screen.getByRole('button', { name: /Send/ }));

    expect(await screen.findByText('Chat is not available right now')).toBeInTheDocument();
  });

  it('disables input while health data is still loading', () => {
    const fhirDataService = buildService();
    fhirDataService.loading.set(true);
    renderChat(fhirDataService);

    expect(screen.getByLabelText('Ask about your health data')).toBeDisabled();
    expect(screen.getByText(/Loading your health data/)).toBeInTheDocument();
  });
});
