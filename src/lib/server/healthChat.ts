import { json, type RequestEvent, type RequestHandler } from '@sveltejs/kit';
import { APICallError, streamText, type CoreMessage, type LanguageModelV1 } from 'ai';
import { z } from 'zod';
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_CHARS, MAX_RECORD_CHARS } from '$lib/config/chat';

export interface HealthChatHandlerOptions {
  /**
   * Returns the model to answer with, or undefined when chat isn't configured (e.g. no API key),
   * in which case requests get a 503. Called per request.
   */
  model: () => LanguageModelV1 | undefined;
  /** Most recent messages forwarded to the model. Defaults to MAX_HISTORY_MESSAGES. */
  maxMessages?: number;
  /** Longest accepted serialized record. Defaults to MAX_RECORD_CHARS. */
  maxRecordChars?: number;
  /**
   * Access check run before anything else. Return false to reject with 403. Leave unset when
   * the app already protects the route (hooks.server.ts does for /api/*).
   */
  authorize?: (event: RequestEvent) => boolean | Promise<boolean>;
}

const UNAVAILABLE = 'Chat is not available right now';
const MODEL_FAILED = 'The model could not answer. Please try again.';

function failure(status: number, message: string) {
  return json({ message }, { status });
}

/**
 * Builds the system prompt. The record is attached here on the server rather than as a
 * client-supplied system message, so clients only ever send user/assistant turns.
 */
export function buildSystemPrompt(record: string): string {
  const recordSection = record.trim()
    ? record
    : '(The patient has not loaded any health data yet.)';
  return [
    "You are a helpful assistant answering a patient's questions about their own health record.",
    'Base your answers only on the health record below. If the record does not contain the',
    'information needed, say so plainly instead of guessing. Explain medical terms in plain',
    'language. You are not a substitute for professional medical advice; for diagnosis or',
    'treatment decisions, suggest the patient talk with their care team.',
    '',
    'The record is a set of FHIR R4 resources, one JSON object per line, grouped by resource type.',
    '',
    '<health_record>',
    recordSection,
    '</health_record>'
  ].join('\n');
}

/**
 * Creates a POST handler that answers questions about the patient's health record with a
 * streaming LLM response in the AI SDK data stream format (consumed by useChat). Mount it in a
 * +server.ts:
 *
 *   export const POST = createHealthChatHandler({ model: () => provider?.chat(LLM_MODEL) });
 *
 * Expects { messages: [{ role: 'user' | 'assistant', content }], record } and responds with
 * 400 for an invalid body, 403 when authorize rejects, 503 when no model is configured, and a
 * streamed answer otherwise. Messages and the record are health data and are never logged.
 */
export function createHealthChatHandler(options: HealthChatHandlerOptions): RequestHandler {
  const maxMessages = options.maxMessages ?? MAX_HISTORY_MESSAGES;
  const maxRecordChars = options.maxRecordChars ?? MAX_RECORD_CHARS;

  // Unknown fields (useChat also sends id, data and message parts) are stripped by zod
  const bodySchema = z.object({
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().max(MAX_MESSAGE_CHARS)
        })
      )
      .min(1),
    record: z.string().max(maxRecordChars)
  });

  return async (event) => {
    if (options.authorize && !(await options.authorize(event))) {
      return failure(403, 'Forbidden');
    }

    let raw: unknown;
    try {
      raw = await event.request.json();
    } catch {
      return failure(400, 'Request body must be JSON');
    }
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return failure(400, 'Invalid chat request');
    }
    const { messages, record } = parsed.data;
    if (messages[messages.length - 1].role !== 'user') {
      return failure(400, 'The last message must be a question from the user');
    }

    const model = options.model();
    if (!model) {
      console.error('health-chat: no model configured (is LLM_API_KEY set?)');
      return failure(503, UNAVAILABLE);
    }

    // Minimal history management; anything smarter (summaries, sessions) happens downstream
    const history: CoreMessage[] = messages
      .slice(-maxMessages)
      .map(({ role, content }) => ({ role, content }));

    const result = streamText({
      model,
      system: buildSystemPrompt(record),
      messages: history,
      abortSignal: event.request.signal,
      onError: ({ error }) => {
        // Log only the failure type and status: messages and record contain health data
        const status = APICallError.isInstance(error) ? ` (status ${error.statusCode})` : '';
        const name = error instanceof Error ? error.name : 'unknown error';
        console.error(`health-chat: model request failed: ${name}${status}`);
      }
    });

    return result.toDataStreamResponse({ getErrorMessage: () => MODEL_FAILED });
  };
}
