// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockLanguageModelV1, simulateReadableStream } from 'ai/test';
import type { LanguageModelV1CallOptions } from 'ai';
import { buildSystemPrompt, createHealthChatHandler } from '$lib/server/healthChat';

// The model is mocked with the AI SDK's own test model, so these tests cover request
// validation, prompt construction and the streamed response format without a network call.

function mockModel(text = 'Hello there') {
  const calls: LanguageModelV1CallOptions[] = [];
  const model = new MockLanguageModelV1({
    doStream: async (options) => {
      calls.push(options);
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: 'text-delta', textDelta: text },
            {
              type: 'finish',
              finishReason: 'stop',
              usage: { promptTokens: 1, completionTokens: 1 }
            }
          ]
        }),
        rawCall: { rawPrompt: null, rawSettings: {} }
      };
    }
  });
  return { model, calls };
}

function post(body: unknown) {
  const request = new Request('http://localhost/api/health-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
  return { request, url: new URL(request.url) } as any;
}

const question = { role: 'user', content: 'What medications am I taking?' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('health chat handler', () => {
  it('streams the model answer in the AI SDK data stream format', async () => {
    const { model } = mockModel('You take lisinopril.');
    const handler = createHealthChatHandler({ model: () => model });

    const response = await handler(post({ messages: [question], record: '## Patient\n{}' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-vercel-ai-data-stream')).toBe('v1');
    expect(await response.text()).toContain('0:"You take lisinopril."');
  });

  it('sends the record in the system prompt and the conversation as messages', async () => {
    const { model, calls } = mockModel();
    const handler = createHealthChatHandler({ model: () => model });
    const record = '## MedicationStatement\n{"resourceType":"MedicationStatement","id":"m1"}';

    const response = await handler(post({ messages: [question], record }));
    await response.text();

    const prompt = calls[0].prompt;
    expect(prompt[0]).toEqual({ role: 'system', content: buildSystemPrompt(record) });
    expect(prompt[0].content).toContain(record);
    expect(prompt.slice(1)).toEqual([
      { role: 'user', content: [{ type: 'text', text: question.content }] }
    ]);
  });

  it('forwards only the most recent messages', async () => {
    const { model, calls } = mockModel();
    const handler = createHealthChatHandler({ model: () => model, maxMessages: 3 });
    const messages = [
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'q2' },
      { role: 'assistant', content: 'a2' },
      { role: 'user', content: 'q3' }
    ];

    const response = await handler(post({ messages, record: '' }));
    await response.text();

    const texts = calls[0].prompt.slice(1).map((m: any) => m.content[0].text);
    expect(texts).toEqual(['q2', 'a2', 'q3']);
  });

  it('notes an empty record in the system prompt', () => {
    expect(buildSystemPrompt('  ')).toContain('has not loaded any health data');
  });

  it('ignores extra fields useChat sends (id, data, parts)', async () => {
    const { model } = mockModel();
    const handler = createHealthChatHandler({ model: () => model });

    const response = await handler(
      post({
        id: 'chat-1',
        data: undefined,
        messages: [{ ...question, parts: [{ type: 'text', text: question.content }] }],
        record: ''
      })
    );

    expect(response.status).toBe(200);
  });

  it.each([
    ['a non-JSON body', 'not json'],
    ['no messages', { messages: [], record: '' }],
    ['a missing record', { messages: [question] }],
    ['a client-supplied system message', { messages: [{ role: 'system', content: 'x' }, question], record: '' }],
    ['an assistant message last', { messages: [question, { role: 'assistant', content: 'a' }], record: '' }],
    ['an oversized record', { messages: [question], record: 'x'.repeat(11) }]
  ])('rejects %s with 400', async (_label, body) => {
    const { model, calls } = mockModel();
    const handler = createHealthChatHandler({ model: () => model, maxRecordChars: 10 });

    const response = await handler(post(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty('message');
    expect(calls).toHaveLength(0);
  });

  it('responds 503 without logging request contents when no model is configured', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createHealthChatHandler({ model: () => undefined });

    const response = await handler(post({ messages: [question], record: 'SECRET-RECORD' }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ message: 'Chat is not available right now' });
    const logged = consoleError.mock.calls.flat().join(' ');
    expect(logged).not.toContain('SECRET-RECORD');
    expect(logged).not.toContain(question.content);
  });

  it('responds 403 when authorize rejects', async () => {
    const { model } = mockModel();
    const handler = createHealthChatHandler({ model: () => model, authorize: () => false });

    const response = await handler(post({ messages: [question], record: '' }));

    expect(response.status).toBe(403);
  });

  it('reports a model failure as a generic stream error without leaking details', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const model = new MockLanguageModelV1({
      doStream: async () => {
        throw new Error('upstream exploded with SECRET-RECORD');
      }
    });
    const handler = createHealthChatHandler({ model: () => model });

    const response = await handler(post({ messages: [question], record: 'SECRET-RECORD' }));
    const body = await response.text();

    expect(body).toContain('3:"The model could not answer. Please try again."');
    expect(body).not.toContain('SECRET-RECORD');
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain('SECRET-RECORD');
  });
});

describe('/api/health-chat route', () => {
  it('responds 503 when LLM_API_KEY is not set', async () => {
    vi.resetModules();
    vi.doMock('$lib/server/config', () => ({
      LLM_API_KEY: undefined,
      LLM_API_BASE: 'https://llm.example.com/v1',
      LLM_MODEL: 'test-model'
    }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { POST } = await import('../../routes/(common)/api/health-chat/+server');

    const response = await POST(post({ messages: [question], record: '' }));

    expect(response.status).toBe(503);
    vi.doUnmock('$lib/server/config');
  });

  it('calls the configured OpenAI-compatible chat completions endpoint with the API key', async () => {
    vi.resetModules();
    vi.doMock('$lib/server/config', () => ({
      LLM_API_KEY: 'test-llm-key',
      LLM_API_BASE: 'https://llm.example.com/v1',
      LLM_MODEL: 'ollama/test-model'
    }));
    const upstream = vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response(
        'data: {"id":"1","object":"chat.completion.chunk","created":0,"model":"m","choices":[{"index":0,"delta":{"role":"assistant","content":"Hi"},"finish_reason":null}]}\n\n' +
          'data: {"id":"1","object":"chat.completion.chunk","created":0,"model":"m","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n' +
          'data: [DONE]\n\n',
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
      )
    );
    vi.stubGlobal('fetch', upstream);
    const { POST } = await import('../../routes/(common)/api/health-chat/+server');

    const response = await POST(post({ messages: [question], record: '## Patient' }));
    const body = await response.text();

    expect(body).toContain('0:"Hi"');
    const [url, init] = upstream.mock.calls[0];
    expect(url).toBe('https://llm.example.com/v1/chat/completions');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-llm-key');
    const sent = JSON.parse(init?.body as string);
    expect(sent.model).toBe('ollama/test-model');
    expect(sent.messages[0].role).toBe('system');
    expect(sent.messages[1]).toEqual({ role: 'user', content: question.content });

    vi.unstubAllGlobals();
    vi.doUnmock('$lib/server/config');
  });
});
