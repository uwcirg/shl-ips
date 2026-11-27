<!--
  Chat about the patient's own health record. The record held by FHIRDataService is serialized
  at submit time and sent with each question to /api/health-chat, which streams the answer back.

  The markup is split along the lines of AI chat element libraries (Conversation, Message,
  PromptInput) so those pieces can later be swapped for dedicated components.
-->
<script lang="ts">
  import { afterUpdate, getContext } from 'svelte';
  import { useChat } from '@ai-sdk/svelte';
  import { Alert, Button, Icon, Input, Spinner } from '@sveltestrap/sveltestrap';
  import { DEFAULT_HEALTH_CHAT_MODE, HEALTH_CHAT_API, MAX_TOOL_STEPS } from '$lib/config/chat';
  import type FHIRDataService from '$lib/utils/FHIRDataService';
  import type { IAuthService } from '$lib/utils/types';
  import { buildRecordContext, type RecordContext } from '$lib/utils/recordContext';
  import { isRecordToolName, parseRecordToolArgs } from '$lib/config/chatTools';
  import { listRecordTypes, searchRecords } from '$lib/utils/recordTools';

  const authService: IAuthService = getContext('authService');
  const fhirDataService: FHIRDataService = getContext('fhirDataService');
  const syncing = fhirDataService.syncing;
  // Toggled by the switch above the conversation; applies from the next question on
  let useTools = DEFAULT_HEALTH_CHAT_MODE === 'tools';

  const { messages, input, handleSubmit, status, error, stop } = useChat({
    api: HEALTH_CHAT_API,
    // Only matters in 'tools' mode: in 'record' mode the server offers no tools, so every
    // answer takes a single step
    maxSteps: MAX_TOOL_STEPS,
    // Runs the model's tool calls against the data in the browser; the returned value is sent
    // back as the tool result and useChat asks the model again. Unknown tools and invalid
    // arguments are answered with an error result, so the model can correct the call.
    onToolCall: async ({ toolCall }) => {
      const name = toolCall.toolName;
      if (!isRecordToolName(name)) return { error: `Unknown tool: ${name}` };
      const collections = fhirDataService.getAllResourceCollections();
      switch (name) {
        case 'listRecordTypes':
          return { types: listRecordTypes(collections) };
        case 'searchRecords': {
          const parsed = parseRecordToolArgs(name, toolCall.args);
          return parsed.success ? searchRecords(collections, parsed.args) : { error: parsed.error };
        }
      }
    },
    // The token is fetched per request so silent renewals are picked up. The mode is added here
    // rather than through useChat's body option, which is fixed when the hook is created, so
    // every request (including the automatic follow-ups carrying tool results) gets the
    // switch's current value
    fetch: async (url, init) => {
      const headers = new Headers(init?.headers);
      const token = await authService.getAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const body =
        typeof init?.body === 'string'
          ? JSON.stringify({ ...JSON.parse(init.body), mode: useTools ? 'tools' : 'record' })
          : init?.body;
      return fetch(url, { ...init, headers, body });
    }
  });

  let lastContext: RecordContext | undefined;
  let conversation: HTMLElement;

  $: busy = $status === 'submitted' || $status === 'streaming';
  $: canSubmit = !busy && !$syncing && $input.trim().length > 0;
  $: errorMessage = $error ? describeError($error) : undefined;

  // Errors from the endpoint arrive as the raw response body, usually { message }
  function describeError(err: Error): string {
    try {
      const parsed = JSON.parse(err.message);
      if (typeof parsed?.message === 'string') return parsed.message;
    } catch {
      // not JSON; fall through
    }
    return err.message || 'Something went wrong.';
  }

  function describeToolResult(result: any): string {
    if (result?.totalMatches !== undefined) {
      const byType = Object.entries(result.matchesByType ?? {})
        .map(([type, n]) => `${type} ${n}`)
        .join(', ');
      return `: ${result.returned} of ${result.totalMatches} matches${byType ? ` (${byType})` : ''}`;
    }
    if (Array.isArray(result?.types)) return `: ${result.types.length} types`;
    return result?.error ? `: ${result.error}` : ': done';
  }

  function submit(event?: Event) {
    event?.preventDefault();
    if (!canSubmit) return;
    if (useTools) {
      lastContext = undefined;
      handleSubmit();
      return;
    }
    // Rebuilt for every question so newly imported data is included
    lastContext = buildRecordContext(fhirDataService.getAllResourceCollections());
    handleSubmit(undefined, { body: { record: lastContext.text } });
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      submit(event);
    }
  }

  // Keep the newest message in view while answers stream in
  afterUpdate(() => {
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  });
</script>

<div class="health-chat d-flex flex-column gap-3">
  <p class="text-muted small mb-0">
    Ask questions about the health data you've imported. Answers are generated by AI from your
    record and may be inaccurate or incomplete. This is not medical advice; talk with your care
    team about health decisions.
  </p>

  <!-- Locked while answering so a question and its tool follow-ups share one mode -->
  <div class="d-flex flex-column align-items-end">
    <!-- reverse puts the label to the left of the switch; the label inherits the muted text -->
    <Input
      type="switch"
      id="health-chat-mode"
      reverse
      bind:checked={useTools}
      disabled={busy}
      label="Enable tool calls"
      aria-describedby="health-chat-mode-help"
    />
    <span id="health-chat-mode-help" class="text-muted small">
      {useTools
        ? 'Enabled: The model will search your record as needed'
        : 'Disabled: Your record will be sent with each question'}
    </span>
  </div>

  <!-- Conversation -->
  <div
    class="conversation border rounded p-3"
    bind:this={conversation}
    role="log"
    aria-live="polite"
    aria-label="Conversation"
  >
    {#if $messages.length === 0}
      <p class="text-muted text-center my-4">
        {#if $syncing}
          <Spinner size="sm" class="me-2" /> Loading your health data...
        {:else}
          Try "What medications am I taking?" or "Summarize my recent lab results."
        {/if}
      </p>
    {/if}
    {#each $messages as message (message.id)}
      <!-- Tool calls made while answering (shown for testing the tools mode) -->
      {#each message.parts ?? [] as part}
        {#if part.type === 'tool-invocation'}
          <div class="text-muted small mb-1">
            <Icon name="search" class="me-1" />
            {part.toolInvocation.toolName}({JSON.stringify(part.toolInvocation.args)})
            {#if part.toolInvocation.state === 'result'}
              <span class="ms-1">{describeToolResult(part.toolInvocation.result)}</span>
            {/if}
          </div>
        {/if}
      {/each}
      {#if message.content}
      <!-- Message -->
      <div class="message d-flex mb-2" class:justify-content-end={message.role === 'user'}>
        <div
          class="message-content rounded px-3 py-2"
          class:bg-primary={message.role === 'user'}
          class:text-white={message.role === 'user'}
          class:bg-light={message.role !== 'user'}
        >
          <span class="visually-hidden">{message.role === 'user' ? 'You:' : 'Assistant:'}</span>
          {message.content}
        </div>
      </div>
      {/if}
    {/each}
    {#if $status === 'submitted'}
      <div class="message d-flex mb-2">
        <div class="message-content rounded px-3 py-2 bg-light text-muted">
          <Spinner size="sm" class="me-2" /> Thinking...
        </div>
      </div>
    {/if}
  </div>

  {#if errorMessage}
    <Alert color="danger" class="mb-0">{errorMessage}</Alert>
  {/if}

  {#if lastContext?.omitted}
    <Alert color="warning" class="mb-0 small">
      Your record is too large to send in full: {lastContext.omitted} of
      {lastContext.count + lastContext.omitted} items were left out of the last question.
    </Alert>
  {/if}

  <!-- PromptInput -->
  <form class="d-flex gap-2 align-items-end" on:submit={submit}>
    <label for="health-chat-input" class="visually-hidden">Ask about your health data</label>
    <textarea
      id="health-chat-input"
      class="form-control"
      rows="2"
      placeholder="Ask about your health data"
      bind:value={$input}
      on:keydown={onKeydown}
      disabled={$syncing}
    />
    {#if busy}
      <Button type="button" color="secondary" on:click={stop}>
        <Icon name="stop-fill" /> Stop
      </Button>
    {:else}
      <Button type="submit" color="primary" disabled={!canSubmit}>
        <Icon name="send" /> Send
      </Button>
    {/if}
  </form>
</div>

<style>
  .conversation {
    min-height: 12rem;
    max-height: 60vh;
    overflow-y: auto;
  }
  .message-content {
    max-width: 85%;
    /* Plain text only for now: no markdown rendering, so no HTML injection surface */
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
