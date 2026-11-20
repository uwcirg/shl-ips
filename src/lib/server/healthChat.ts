import { json, type RequestEvent, type RequestHandler } from '@sveltejs/kit';
import {
  APICallError,
  convertToCoreMessages,
  streamText,
  tool,
  type CoreMessage,
  type LanguageModelV1,
  type Message
} from 'ai';
import { z } from 'zod';
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_CHARS, MAX_RECORD_CHARS } from '$lib/config/chat';

/**
 * Tools the model can call in 'tools' mode. They have no execute function, so the AI SDK
 * streams each call to the browser, where useChat's onToolCall runs it (recordTools.ts) and
 * sends the result back with the next request.
 */
export const RECORD_TOOLS = {
  listRecordTypes: tool({
    description:
      "List the kinds of data in the patient's record (FHIR resource types), with how many of " +
      'each and the date range they cover. Call this first if unsure what the record contains.',
    parameters: z.object({})
  }),
  searchRecords: tool({
    description:
      "Search the patient's record for FHIR R4 resources. Every filter given must match; omit " +
      'a filter to leave it unrestricted. ' +
      'Returns { totalMatches, returned, matchesByType, results, note? }: results are the ' +
      'matching resources, newest first, each with the resources it references attached as ' +
      '"referenced" (e.g. the Medication behind a MedicationRequest). matchesByType counts all ' +
      'matches, including those not returned. When returned is less than totalMatches the ' +
      'results are incomplete, so refine the filters to see the rest before relying on them to ' +
      'answer. A note explains an empty or incomplete result.',
    parameters: z.object({
      types: z
        .array(z.string())
        .optional()
        .describe(
          'FHIR resource types to include, matched exactly against resourceType, e.g. ' +
            '["Observation"]. Medications may be recorded as MedicationRequest, ' +
            'MedicationStatement or MedicationAdministration; use listRecordTypes to see which ' +
            'types the record contains.'
        ),
      status: z
        .array(z.string())
        .optional()
        .describe(
          'Status codes to include, matched against the resource\'s status (e.g. "active", ' +
            '"completed", "stopped") or clinicalStatus code (e.g. "active", "resolved"). ' +
            'Current medications, conditions and allergies have status "active".'
        ),
      text: z
        .string()
        .optional()
        .describe(
          'Words that must all appear (case-insensitive substring match) in the values of the ' +
            'resource or the resources it references, such as coded display names, values, ' +
            'units and notes. Does not match resourceType, ids or code system URLs, e.g. ' +
            '"a1c", "metformin", "blood pressure".'
        ),
      since: z
        .string()
        .optional()
        .describe('ISO 8601 date. Only resources whose clinical date is on or after it.'),
      until: z
        .string()
        .optional()
        .describe('ISO 8601 date. Only resources whose clinical date is on or before it.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Most results to return, 1 to 20 (default 10)')
    })
  })
};

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

/** System prompt for 'tools' mode: no record attached, the model searches it with tools */
export function buildToolsSystemPrompt(): string {
  return [
    "You are a helpful assistant answering a patient's questions about their own health record.",
    'The record is not included in this conversation. Use the provided tools to look up the',
    'data you need before answering, and base your answers only on what the tools return. If a',
    'search finds nothing, try another search term before concluding the information is not in',
    'the record, and then say so plainly instead of guessing. Explain medical terms in plain',
    'language. You are not a substitute for professional medical advice; for diagnosis or',
    'treatment decisions, suggest the patient talk with their care team.',
    '',
    'Tool results are FHIR R4 resources as JSON.'
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

  // Unknown fields (useChat also sends id and data) are stripped by zod. toolInvocations and
  // parts carry tool calls and their results in 'tools' mode; convertToCoreMessages checks their
  // contents rather than this schema
  const bodySchema = z.object({
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().max(MAX_MESSAGE_CHARS),
          toolInvocations: z.array(z.unknown()).optional(),
          parts: z.array(z.unknown()).optional()
        })
      )
      .min(1),
    mode: z.enum(['record', 'tools']).default('record'),
    // Required in 'record' mode, unused in 'tools' mode
    record: z.string().max(maxRecordChars).optional()
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
    const { messages, mode, record } = parsed.data;
    if (mode === 'record' && record === undefined) {
      return failure(400, 'Invalid chat request');
    }
    // In 'tools' mode the follow-up request after a tool call ends with the assistant message
    // that carries the call and its result
    const last = messages[messages.length - 1];
    const lastIsToolResult = mode === 'tools' && last.role === 'assistant' && !!last.toolInvocations?.length;
    if (last.role !== 'user' && !lastIsToolResult) {
      return failure(400, 'The last message must be a question from the user');
    }

    const model = options.model();
    if (!model) {
      console.error('health-chat: no model configured (is LLM_API_KEY set?)');
      return failure(503, UNAVAILABLE);
    }

    // Minimal history management; anything smarter (summaries, sessions) happens downstream.
    // Tool calls live inside their assistant message, so slicing never splits a call from its
    // result.
    const recent = messages.slice(-maxMessages);
    let history: CoreMessage[];
    if (mode === 'tools') {
      try {
        history = convertToCoreMessages(recent as Omit<Message, 'id'>[], { tools: RECORD_TOOLS });
      } catch {
        return failure(400, 'Invalid chat request');
      }
    } else {
      history = recent.map(({ role, content }) => ({ role, content }));
    }

    const result = streamText({
      model,
      ...(mode === 'tools'
        ? { system: buildToolsSystemPrompt(), tools: RECORD_TOOLS }
        : { system: buildSystemPrompt(record ?? '') }),
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
