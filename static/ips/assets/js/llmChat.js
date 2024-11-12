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

async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const userMessage = chatInput.value.trim();
    
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

    insertMessageIntoUi('user', "Your query: " + userMessage);

    chatInput.value = '';

    try {
        // FIXME use a .env variable for this URL, a la the VITE configs...
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
            content: [{ type: "text", text: data.content}]
        });

        const promptTokens = data.prompt_tokens;
        const completionTokens = data.completion_tokens;

        const formattedResponse = `LLM: ${data.content} (prompt_tokens=${promptTokens}, completion_tokens=${completionTokens})`;
        insertMessageIntoUi('assistant', formattedResponse);
    } catch (error) {
        console.error('Error sending message to LLM:', error);
        insertMessageIntoUi('error', 'Failed to get a response. Please try again.');
    }
}

function insertMessageIntoUi(role, content) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', role);
    messageElement.textContent = content;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

export { initLLMChat };
