import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private'; // Access private environment variables

const CPCDS_URL = 'https://cpcds-server.lantanagroup.com/fhir';
const SMART_LAUNCH_URL = `${CPCDS_URL}/.well-known/smart-configuration`;

export const POST = async ({ request, url }: { request: Request; url: URL }) => {
  try {
    // Get the base URL path to the current route
    const proxyPath = url.pathname;

    // Construct the forward URL by removing the base path (dynamic)
    const forwardPath = proxyPath.replace(url.origin, ''); // Strip the origin
    const forwardQuery = url.search; // Includes the "?" and any query parameters

    // Construct the full target API URL
    const targetUrl = `https://api.example.com${forwardPath}${forwardQuery}`;

    // Read the incoming request body
    const body = await request.text(); // Use `text()` for flexibility (JSON, form data, etc.)

    // Set up headers and include the client secret
    const clientSecret = env.CLIENT_SECRET;

    const headers = new Headers(request.headers);
    headers.set('Authorization', `Basic ${btoa(`client_id:${clientSecret}`)}`);
    headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json');

    // Forward the request to the target API
    const apiResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ['POST', 'PUT', 'PATCH'].includes(request.method) ? body : undefined, // Include body if applicable
    });

    // Return the API response to the client
    const responseText = await apiResponse.text();
    return new Response(responseText, {
      status: apiResponse.status,
      headers: apiResponse.headers, // Pass response headers
    });
  } catch (error) {
    console.error('Proxy error:', error);

    // Handle and return errors
    return json({ error: 'An error occurred while forwarding the request' }, { status: 500 });
  }
};