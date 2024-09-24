<script>
  import { onMount } from 'svelte';

  export let fhirResources;

  let messages = [];
  let input = '';

  async function sendMessage() {
    if (input.trim() === '') return;

    const userMessage = { role: 'user', content: input };
    messages = [...messages, userMessage];
    input = '';

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          fhirResources,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiMessage = { role: 'assistant', content: data.message };
      messages = [...messages, aiMessage];
    } catch (error) {
      console.error('Error sending message to AI:', error);
      // Handle error (e.g., display error message to user)
    }
  }
</script>

<div class="ai-chat-interface">
  <div class="chat-messages">
    {#each messages as message}
      <div class="message {message.role}">
        {message.content}
      </div>
    {/each}
  </div>
  <div class="chat-input">
    <input
      type="text"
      bind:value={input}
      placeholder="Ask a question about your health..."
    />
    <button on:click={sendMessage}>Send</button>
  </div>
</div>

<style>
  .ai-chat-interface {
    display: flex;
    flex-direction: column;
    height: 400px;
  }
  .chat-messages {
    flex-grow: 1;
    overflow-y: auto;
    padding: 10px;
  }
  .message {
    margin-bottom: 10px;
    padding: 5px;
    border-radius: 5px;
  }
  .user {
    background-color: #e6f2ff;
    align-self: flex-end;
  }
  .assistant {
    background-color: #f0f0f0;
    align-self: flex-start;
  }
  .chat-input {
    display: flex;
    padding: 10px;
  }
  input {
    flex-grow: 1;
    margin-right: 10px;
  }
</style>
