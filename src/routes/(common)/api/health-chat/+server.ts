import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createHealthChatHandler } from '$lib/server/healthChat';
import { LLM_API_BASE, LLM_API_KEY, LLM_MODEL } from '$lib/server/config';

// Access is checked in hooks.server.ts, which requires a valid bearer token for /api/*.
// Instances can disable this endpoint with INSTANCE_CONFIG.disallowedEndpoints: ['health-chat'].

// The generic OpenAI-compatible provider rather than @ai-sdk/openai: the latter treats any model
// id starting with "o" (e.g. "ollama/mistral:7b") as an OpenAI reasoning model and rewrites the
// request for it (system prompt sent as a "developer" message, sampling settings dropped).
const provider = LLM_API_KEY
  ? createOpenAICompatible({ name: 'llm-gateway', baseURL: LLM_API_BASE, apiKey: LLM_API_KEY })
  : undefined;

// chatModel() targets the gateway's /chat/completions endpoint
export const POST = createHealthChatHandler({ model: () => provider?.chatModel(LLM_MODEL) });
