// import fetch from 'node-fetch';
import { error, json } from '@sveltejs/kit';
import {
  CARIN_HOSTS,
  REDIRECT_URI
} from '$lib/server/config';

export const POST = async ({ params, request }: { params: { host: string }; request: Request; }) => {
  console.log('Token exchange');
  const restPath = params.host;
  const { code, code_verifier } = await request.json();

  let clientId = CARIN_HOSTS[restPath].clientId;
  let clientSecret = CARIN_HOSTS[restPath].clientSecret;
  let tokenEndpoint = CARIN_HOSTS[restPath].tokenEndpoint;

  console.log({clientId, clientSecret, tokenEndpoint, REDIRECT_URI});

  if (!(clientId && clientSecret && tokenEndpoint && REDIRECT_URI)) {
    throw error(500, { message: "Server configuration error" });
  }

  const basicAuthToken = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  console.log(basicAuthToken);

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuthToken}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier,
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (response.ok) {
    let data = await response.text();
    return json(JSON.parse(data));
  } else {
    return response;
    // throw error(500, { message: "Token exchange failed" });
  }
};
