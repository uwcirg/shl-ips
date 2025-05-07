/**
import {
  LLM_SERVICE_URI
} from '$lib/config';
*/

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

function insertMessageIntoUi(role, userMessage) {
    const chatMessages = document.getElementById('chat-messages');
    
    // Create a new table row for the user message
    const row = document.createElement('tr');

    // Create cells for the request
    const requestCell = document.createElement('td');
    requestCell.textContent = userMessage;

    // Create empty cells for response and tokens
    const responseCell = document.createElement('td');
    const promptTokensCell = document.createElement('td');
    const completionTokensCell = document.createElement('td');
    const costCell = document.createElement('td');

    // Append cells to the row
    row.appendChild(requestCell);
    row.appendChild(responseCell);
    row.appendChild(promptTokensCell);
    row.appendChild(completionTokensCell);
    row.appendChild(costCell);

    // Append the row to the chat messages table
    chatMessages.appendChild(row);

    // Return the row for later updates
    return row;
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

    // Insert the user message into the UI and get the row reference
    const row = insertMessageIntoUi('user', userMessage);

    chatInput.value = '';

    try {
        //const response = await fetch('https://llm-service.fl.mcjustin.dev.cirg.uw.edu/api/chat', {
        const response = await fetch('https://llm-service.ubu.mcjustin.wvp.dev.cirg.uw.edu/api/chat', {
        // const response = await fetch(LLM_SERVICE_URI, { // this didn't seem to work...
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
        const costInput = parseInt(promptTokens) * 0.15 / 1000000;
        const costOutput = parseInt(completionTokens) * 0.6 / 1000000;
        const cost = costInput + costOutput;

        // Update the existing row with the response and token counts
        row.cells[1].textContent = data.content; // Response
        row.cells[2].textContent = promptTokens; // Prompt Tokens
        row.cells[3].textContent = completionTokens; // Completion Tokens
        row.cells[4].textContent = costInput.toString().substring(0,7) + " + " + costOutput.toString().substring(0,7) + " = " + cost.toString().substring(0,7);
    } catch (error) {
        console.error('Error sending message to LLM:', error);
        row.cells[1].textContent = 'Failed to get a response. Please try again.'; // Update response cell with error message
    }
}// async function sendMessage() {

export { initLLMChat };
