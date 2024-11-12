let fhirResources = null;
let messages = [];

function initLLMChat(resources) {
    fhirResources = resources;
    const llmChatContent = document.getElementById('llm-chat-content');
    const chatInput = document.getElementById('chat-input');
    const sendMessageButton = document.getElementById('send-message');

    sendMessageButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

function insertMessageIntoUi(role, userMessage, llmResponse, promptTokens, completionTokens) {
    const chatMessages = document.getElementById('chat-messages');

    // Create a new table row
    const row = document.createElement('tr');

    // Create cells for each piece of information
    const requestCell = document.createElement('td');
    requestCell.textContent = userMessage;

    const responseCell = document.createElement('td');
    responseCell.textContent = llmResponse;

    const promptTokensCell = document.createElement('td');
    promptTokensCell.textContent = promptTokens;

    const completionTokensCell = document.createElement('td');
    completionTokensCell.textContent = completionTokens;

    // Append cells to the row
    row.appendChild(requestCell);
    row.appendChild(responseCell);
    row.appendChild(promptTokensCell);
    row.appendChild(completionTokensCell);

    // Append the row to the chat messages table
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Update the sendMessage function to use the new insertMessageIntoUi
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const userMessage = chatInput.value.trim();
    if (userMessage.length === 0) return;

    // Append the FHIR resources as the first message
    if (messages.length === 0) {
        messages.push({
            role: "user",
            content: [{ type: "text", text: JSON.stringify(fhirResources) }]
        });
    }

    // Append the user message
    messages.push({
        role: "user",
        content: [{ type: "text", text: userMessage }]
    });

    // Insert the user message into the UI
    insertMessageIntoUi('user', userMessage, '', '', '');

    chatInput.value = '';

    try {
        // FIXME move this URL to config
        const response = await fetch('https://llm-service.fl.mcjustin.dev.cirg.uw.edu/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages: messages }), // Send the messages array
        });

        if (!response.ok) {
            throw new Error('Failed to get LLM response');
        }

        const data = await response.json();
        // Append the assistant's response
        messages.push({
            role: "assistant",
            content: [{ type: "text", text: data.content }]
        });

        const promptTokens = data.prompt_tokens;
        const completionTokens = data.completion_tokens;

        // Insert the assistant's response into the UI
        insertMessageIntoUi('assistant', userMessage, data.content, promptTokens, completionTokens);
    } catch (error) {
        console.error('Error sending message to LLM:', error);
        insertMessageIntoUi('error', userMessage, 'Failed to get a response. Please try again.', '', '');
    }
}

export { initLLMChat };
