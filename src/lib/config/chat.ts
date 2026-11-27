// Limits shared by the health record chat client (HealthChat.svelte, recordContext.ts) and its
// server endpoint (/api/health-chat), so both sides agree on what a valid request looks like.

/** Endpoint the chat component posts to */
export const HEALTH_CHAT_API = '/api/health-chat';

/**
 * How the chat gives the model the patient's record:
 * - 'record': the serialized record is sent with every question (see MAX_RECORD_CHARS)
 * - 'tools':  no record is sent; the model calls client-side tools (recordTools.ts) to search it
 */
export type HealthChatMode = 'record' | 'tools';
/** Mode the chat starts in; users can switch it in the chat */
export const DEFAULT_HEALTH_CHAT_MODE: HealthChatMode = 'record';

/** Most model calls per question in 'tools' mode (each tool round trip is one more) */
export const MAX_TOOL_STEPS = 6;

/**
 * Upper bound on the serialized health record sent with each question. Kept below
 * adapter-node's default 512 KB BODY_SIZE_LIMIT with room left for the conversation itself.
 * Smarter context selection and compression happen downstream of this app.
 */
export const MAX_RECORD_CHARS = 300_000;

/** Longest single message (user question or prior assistant answer) the server accepts */
export const MAX_MESSAGE_CHARS = 8_000;

/** Most recent messages forwarded to the model; older turns are dropped on the server */
export const MAX_HISTORY_MESSAGES = 20;
