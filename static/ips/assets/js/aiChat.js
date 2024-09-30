let fhirResources = null;

function initAIChat(resources) {
    fhirResources = resources;
    const aiChatContent = document.getElementById('ai-chat-content');
    const chatInput = document.getElementById('chat-input');
    const sendMessageButton = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');

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
        const response = await fetch('/api/ai-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: userMessage }],
                fhirResources: fhirResources,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to get AI response');
        }

        const data = await response.json();
        appendMessage('assistant', data.message);
    } catch (error) {
        console.error('Error sending message to AI:', error);
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

export { initAIChat };
