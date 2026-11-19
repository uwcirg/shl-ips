// Limits shared by the health record chat client (HealthChat.svelte, recordContext.ts) and its
// server endpoint (/api/health-chat), so both sides agree on what a valid request looks like.

/** Endpoint the chat component posts to */
export const HEALTH_CHAT_API = '/api/health-chat';

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
