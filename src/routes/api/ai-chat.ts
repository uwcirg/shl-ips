import { Configuration, OpenAIApi } from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { messages, fhirResources } = await request.json();

    const apiMessages = [
      { role: 'system', content: 'You are a helpful assistant that can answer questions about a user\'s health based on their FHIR resources.' },
      { role: 'system', content: `Here are the user's FHIR resources: ${JSON.stringify(fhirResources)}` },
      { role: 'user', content: message }
    ];

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: apiMessages,
    });

    return new Response(JSON.stringify({ message: completion.data.choices[0].message.content }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in AI chat:', error);
    return new Response(JSON.stringify({ error: 'An error occurred while processing your request.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
