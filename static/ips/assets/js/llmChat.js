let fhirResources = null;

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
    const chatMessages = document.getElementById('chat-messages');
    const userMessage = chatInput.value.trim();
    
    if (userMessage === '') return;

    appendMessage('user', userMessage);
    chatInput.value = '';

    try {
        // FIXME use a .env variable for this URL, a la the VITE configs...
        const response = await fetch('https://llm-chat.fl.mcjustin.dev.cirg.uw.edu/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage,
                fhirResources: fhirResources,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to get LLM response');
        }

        const data = await response.json();
        appendMessage('assistant', data.message);
    } catch (error) {
        console.error('Error sending message to LLM:', error);
        appendMessage('error', 'Failed to get a response. Please try again.');
    }
}

function appendMessage(role, content) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', role);
    messageElement.textContent = content;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

export { initLLMChat };
